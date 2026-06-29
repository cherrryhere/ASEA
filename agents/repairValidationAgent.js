import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs-extra";

const execAsync = promisify(exec);

function flattenSpecs(suites = []) {
  const testResults = [];

  function walkSuite(suite, parentTitle = "") {
    const suiteTitle = suite.title || parentTitle;

    if (Array.isArray(suite.specs)) {
      suite.specs.forEach((spec) => {
        const specTitle = spec.title || "Untitled Test";

        if (Array.isArray(spec.tests)) {
          spec.tests.forEach((test) => {
            const result = Array.isArray(test.results) ? test.results[0] : null;

            testResults.push({
              suite: suiteTitle,
              testTitle: specTitle,
              status: result?.status || "unknown",
              duration: result?.duration || 0,
              errorMessage:
                result?.error?.message ||
                result?.errors?.[0]?.message ||
                "",
              errorStack:
                result?.error?.stack ||
                result?.errors?.[0]?.stack ||
                "",
              retry: result?.retry || 0,
              workerIndex: result?.workerIndex || 0
            });
          });
        }
      });
    }

    if (Array.isArray(suite.suites)) {
      suite.suites.forEach((childSuite) => walkSuite(childSuite, suiteTitle));
    }
  }

  suites.forEach((suite) => walkSuite(suite));

  return testResults;
}

function buildSummary(testResults) {
  const total = testResults.length;
  const passed = testResults.filter((test) => test.status === "passed").length;
  const failed = testResults.filter((test) => test.status === "failed").length;
  const skipped = testResults.filter((test) => test.status === "skipped").length;
  const timedOut = testResults.filter((test) => test.status === "timedOut").length;
  const interrupted = testResults.filter((test) => test.status === "interrupted").length;

  return {
    total,
    passed,
    failed,
    skipped,
    timedOut,
    interrupted,
    passRate: total > 0 ? Number(((passed / total) * 100).toFixed(2)) : 0
  };
}

async function runPlaywrightSuite({ folderPath }) {
  await fs.ensureDir(folderPath);

  const command = `npx playwright test ${folderPath} --reporter=json`;

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    const result = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 30
    });

    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    stdout = error.stdout || "";
    stderr = error.stderr || "";
    exitCode = error.code || 1;
  }

  let testResults = [];

  try {
    const parsedReport = JSON.parse(stdout);
    testResults = flattenSpecs(parsedReport.suites || []);
  } catch (parseError) {
    testResults = [
      {
        suite: "Execution Error",
        testTitle: `Could not parse Playwright JSON output for ${folderPath}`,
        status: "failed",
        duration: 0,
        errorMessage: parseError.message,
        errorStack: stderr || stdout,
        retry: 0,
        workerIndex: 0
      }
    ];
  }

  return {
    command,
    folderPath,
    exitCode,
    summary: buildSummary(testResults),
    testResults,
    executedAt: new Date().toISOString()
  };
}

export async function validateRepairResults() {
  const generatedExists = await fs.pathExists("tests/generated");
  const repairedExists = await fs.pathExists("tests/repaired");

  if (!generatedExists) {
    throw new Error("tests/generated folder does not exist.");
  }

  if (!repairedExists) {
    throw new Error("tests/repaired folder does not exist.");
  }

  const generatedFiles = (await fs.readdir("tests/generated")).filter((file) =>
    file.endsWith(".spec.js")
  );

  const repairedFiles = (await fs.readdir("tests/repaired")).filter((file) =>
    file.endsWith(".spec.js")
  );

  if (generatedFiles.length === 0) {
    throw new Error("No generated test files found in tests/generated.");
  }

  if (repairedFiles.length === 0) {
    throw new Error("No repaired test files found in tests/repaired.");
  }

  const generatedExecution = await runPlaywrightSuite({
    folderPath: "tests/generated"
  });

  const repairedExecution = await runPlaywrightSuite({
    folderPath: "tests/repaired"
  });

  const beforePassRate = generatedExecution.summary.passRate;
  const afterPassRate = repairedExecution.summary.passRate;

  const passRateImprovement = Number((afterPassRate - beforePassRate).toFixed(2));
  const passedImprovement =
    repairedExecution.summary.passed - generatedExecution.summary.passed;
  const failedReduction =
    generatedExecution.summary.failed - repairedExecution.summary.failed;

  let validationStatus = "No Improvement";

  if (passRateImprovement > 0) {
    validationStatus = "Improved";
  } else if (passRateImprovement === 0) {
    validationStatus = "No Change";
  } else {
    validationStatus = "Regression";
  }

  return {
    validationStatus,
    generatedFilesCount: generatedFiles.length,
    repairedFilesCount: repairedFiles.length,
    beforeRepair: generatedExecution,
    afterRepair: repairedExecution,
    comparison: {
      beforePassRate,
      afterPassRate,
      passRateImprovement,
      passedImprovement,
      failedReduction
    },
    validationSummary:
      validationStatus === "Improved"
        ? `Repair improved pass rate by ${passRateImprovement}%.`
        : validationStatus === "Regression"
          ? `Repair reduced pass rate by ${Math.abs(passRateImprovement)}%.`
          : "Repair did not change the pass rate.",
    validatedAt: new Date().toISOString()
  };
}