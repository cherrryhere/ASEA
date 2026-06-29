import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getGroqClient, groqConfig } from "../config/groq.js";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      return JSON.parse(match[0]);
    }

    throw new Error("Groq response was not valid JSON");
  }
}

async function readGeneratedSpecFiles() {
  const generatedDir = "tests/generated";

  await fs.ensureDir(generatedDir);

  const files = await fs.readdir(generatedDir);

  const specFiles = files.filter((file) => file.endsWith(".spec.js"));

  const fileContents = [];

  for (const fileName of specFiles) {
    const filePath = path.join(generatedDir, fileName);
    const content = await fs.readFile(filePath, "utf-8");

    fileContents.push({
      fileName,
      filePath,
      content
    });
  }

  return fileContents;
}

function reduceFailureAnalysis(failureAnalysis) {
  if (!failureAnalysis || !Array.isArray(failureAnalysis.failures)) {
    return [];
  }

  return failureAnalysis.failures.map((failure) => ({
    testTitle: failure.testTitle || "",
    failureType: failure.failureType || "",
    rootCause: failure.rootCause || "",
    technicalReason: failure.technicalReason || "",
    suggestedFix: failure.suggestedFix || "",
    isApplicationBug: failure.isApplicationBug || false,
    isTestScriptIssue: failure.isTestScriptIssue || false,
    priority: failure.priority || ""
  }));
}

export async function repairGeneratedTests({ executionData, failureAnalysis }) {
  await fs.ensureDir("tests/repaired");

  const failedCount = executionData?.summary?.failed || 0;

  if (failedCount === 0) {
    return {
      repaired: false,
      message: "No failed tests found. Repair is not required.",
      totalRepairedFiles: 0,
      files: [],
      repairedAt: new Date().toISOString()
    };
  }

  const generatedFiles = await readGeneratedSpecFiles();

  if (generatedFiles.length === 0) {
    throw new Error("No generated Playwright spec files found in tests/generated.");
  }

  const groq = getGroqClient();

  const prompt = `
You are ASEA, a Self-Healing Playwright Test Repair Agent.

Your job is to repair failed generated Playwright tests.

You will receive:
1. Current generated Playwright test files
2. Test execution summary
3. Failure analysis

Repair only test-script issues such as:
- Bad selector
- Wrong assertion
- Wrong expected text
- Brittle locator
- Incorrect URL expectation
- Timeout caused by weak selector

Do NOT fake passing tests.
Do NOT remove important test coverage.
Do NOT skip failed tests.
Do NOT use test.skip.
Do NOT comment out failing tests.

Execution Summary:
${JSON.stringify(executionData.summary, null, 2)}

Failure Analysis:
${JSON.stringify(reduceFailureAnalysis(failureAnalysis), null, 2)}

Generated Test Files:
${JSON.stringify(
    generatedFiles.map((file) => ({
      fileName: file.fileName,
      content: file.content
    })),
    null,
    2
  )}

Return ONLY valid JSON.

IMPORTANT:
Return repaired code using contentLines array.
Each line of code must be one string.

Use this exact structure:

{
  "repairSummary": "",
  "files": [
    {
      "originalFileName": "",
      "repairedFileName": "",
      "description": "",
      "changesMade": [],
      "contentLines": []
    }
  ]
}

Rules:
- Use JavaScript Playwright syntax.
- Include import { test, expect } from "@playwright/test";
- Use stable locators: getByRole, getByText, getByLabel, getByPlaceholder, locator.
- Prefer visible text and semantic roles.
- Avoid regex URLs with raw slashes.
- Use string URLs in toHaveURL when possible.
- Keep tests executable.
- Do not include markdown.
- Do not include triple backticks.
`;

  const response = await groq.chat.completions.create({
    model: groqConfig.model,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.2
  });

  const content = response.choices[0].message.content;
  const parsed = safeJsonParse(content);

  const repairedFiles = Array.isArray(parsed.files) ? parsed.files : [];

  if (repairedFiles.length === 0) {
    throw new Error("AI did not return repaired test files.");
  }

  const savedFiles = [];

  for (const file of repairedFiles) {
    const repairedFileName =
      file.repairedFileName ||
      `repaired-${file.originalFileName || uuidv4()}.spec.js`;

    const safeFileName = repairedFileName.endsWith(".spec.js")
      ? repairedFileName
      : `${repairedFileName}.spec.js`;

    const filePath = path.join("tests/repaired", safeFileName);

    const fileContent = buildFileContent(file.contentLines);

    await fs.writeFile(filePath, fileContent);

    savedFiles.push({
      originalFileName: file.originalFileName || "",
      repairedFileName: safeFileName,
      filePath,
      description: file.description || "",
      changesMade: Array.isArray(file.changesMade) ? file.changesMade : []
    });
  }

  return {
    repaired: true,
    message: "Generated Playwright tests repaired successfully.",
    repairSummary:
      parsed.repairSummary ||
      "Failed generated tests were repaired using AI.",
    totalRepairedFiles: savedFiles.length,
    files: savedFiles,
    repairedAt: new Date().toISOString()
  };
}

function buildFileContent(contentLines) {
  let finalContent = "";

  if (Array.isArray(contentLines)) {
    finalContent = contentLines.join("\n");
  }

  finalContent = String(finalContent || "").trim();

  if (!finalContent.includes("@playwright/test")) {
    finalContent = `import { test, expect } from "@playwright/test";\n\n${finalContent}`;
  }

  return finalContent;
}