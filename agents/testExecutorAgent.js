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

export async function executeGeneratedTests() {
  await fs.ensureDir("test-results");

  const command = "npx playwright test tests/generated --reporter=json";

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    const result = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 20
    });

    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    stdout = error.stdout || "";
    stderr = error.stderr || "";
    exitCode = error.code || 1;
  }

  let parsedReport = null;
  let testResults = [];

  try {
    parsedReport = JSON.parse(stdout);
    testResults = flattenSpecs(parsedReport.suites || []);
  } catch (parseError) {
    testResults = [
      {
        suite: "Execution Error",
        testTitle: "Could not parse Playwright JSON output",
        status: "failed",
        duration: 0,
        errorMessage: parseError.message,
        errorStack: stderr || stdout,
        retry: 0,
        workerIndex: 0
      }
    ];
  }

  const summary = buildSummary(testResults);

  return {
    command,
    exitCode,
    summary,
    testResults,
    executedAt: new Date().toISOString()
  };
}