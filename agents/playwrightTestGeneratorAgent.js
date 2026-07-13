import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  getGroqClient,
  groqConfig
} from "../config/groq.js";

const GENERATED_TESTS_DIRECTORY = "tests/generated";

function sanitizeFileName(value) {
  const cleanValue = String(value || "generated-test")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return cleanValue || "generated-test";
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function removeMarkdownCodeFences(value) {
  let content = cleanText(value);

  content = content.replace(/^```(?:javascript|js|typescript|ts)?\s*/i, "");
  content = content.replace(/\s*```$/i, "");

  return content.trim();
}

function extractGroqResponseText(response) {
  return cleanText(
    response?.choices?.[0]?.message?.content ||
      response?.choices?.[0]?.text ||
      ""
  );
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step, index) => {
      if (typeof step === "string") {
        return {
          stepNumber: index + 1,
          action: cleanText(step),
          expectedResult: ""
        };
      }

      return {
        stepNumber:
          step?.stepNumber ||
          step?.step ||
          step?.number ||
          index + 1,
        action:
          cleanText(
            step?.action ||
              step?.instruction ||
              step?.description ||
              step?.stepDescription ||
              ""
          ),
        expectedResult:
          cleanText(
            step?.expectedResult ||
              step?.expected ||
              step?.result ||
              ""
          )
      };
    })
    .filter((step) => step.action);
}

function normalizeTestCase(testCase, index) {
  if (typeof testCase === "string") {
    return {
      id: `TC-${index + 1}`,
      title: cleanText(testCase),
      description: cleanText(testCase),
      preconditions: [],
      steps: [],
      expectedResult: ""
    };
  }

  const title =
    cleanText(
      testCase?.title ||
        testCase?.testTitle ||
        testCase?.name ||
        testCase?.scenario ||
        testCase?.testCase ||
        testCase?.description
    ) || `Generated Test ${index + 1}`;

  const rawPreconditions =
    testCase?.preconditions ||
    testCase?.preConditions ||
    testCase?.prerequisites ||
    [];

  const preconditions = Array.isArray(rawPreconditions)
    ? rawPreconditions.map(cleanText).filter(Boolean)
    : cleanText(rawPreconditions)
      ? [cleanText(rawPreconditions)]
      : [];

  return {
    id:
      cleanText(
        testCase?.id ||
          testCase?.testCaseId ||
          testCase?.testId
      ) || `TC-${index + 1}`,

    title,

    description:
      cleanText(
        testCase?.description ||
          testCase?.objective ||
          testCase?.scenario ||
          title
      ),

    type:
      cleanText(
        testCase?.type ||
          testCase?.testType ||
          testCase?.category
      ),

    priority:
      cleanText(testCase?.priority || "Medium"),

    preconditions,

    testData:
      testCase?.testData ||
      testCase?.data ||
      {},

    steps: normalizeSteps(
      testCase?.steps ||
        testCase?.testSteps ||
        testCase?.actions ||
        []
    ),

    expectedResult:
      cleanText(
        testCase?.expectedResult ||
          testCase?.expected ||
          testCase?.result ||
          testCase?.expectedOutcome
      )
  };
}

function collectTestCases(testCaseData) {
  const collected = [];

  function visit(value) {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const looksLikeTestCase =
      value.title ||
      value.testTitle ||
      value.testCaseId ||
      value.testSteps ||
      value.steps ||
      value.expectedResult;

    if (looksLikeTestCase) {
      collected.push(value);
      return;
    }

    const possibleCollections = [
      value.testCases,
      value.cases,
      value.generatedTestCases,
      value.features,
      value.scenarios,
      value.data,
      value.result
    ];

    possibleCollections.forEach(visit);
  }

  visit(testCaseData);

  const uniqueTestCases = [];
  const seen = new Set();

  collected.forEach((testCase) => {
    const signature = JSON.stringify({
      title:
        testCase?.title ||
        testCase?.testTitle ||
        testCase?.name ||
        testCase?.scenario ||
        "",
      id:
        testCase?.id ||
        testCase?.testCaseId ||
        testCase?.testId ||
        ""
    });

    if (!seen.has(signature)) {
      seen.add(signature);
      uniqueTestCases.push(testCase);
    }
  });

  return uniqueTestCases.map(normalizeTestCase);
}

function buildTestCasePrompt({
  websiteUrl,
  testCase
}) {
  return `
You are a senior Playwright automation engineer.

Generate one complete Playwright JavaScript test file for the test case below.

WEBSITE URL:
${websiteUrl}

TEST CASE:
${JSON.stringify(testCase, null, 2)}

MANDATORY RULES:

1. Return only executable JavaScript.
2. Do not return JSON.
3. Do not use Markdown code fences.
4. Import test and expect from "@playwright/test".
5. Use this exact import:

import { test, expect } from "@playwright/test";

6. The file must contain one Playwright test.
7. Start by navigating to:

await page.goto(${JSON.stringify(websiteUrl)});

8. Use reliable selectors in this priority order:
   - getByRole
   - getByLabel
   - getByPlaceholder
   - getByText
   - locator with id
   - locator with name
   - CSS selector only when necessary

9. Do not invent invalid JavaScript.
10. Do not include explanations before or after the code.
11. Use proper JavaScript escaping.
12. Avoid XPath unless absolutely necessary.
13. Add reasonable visibility assertions.
14. Do not place valid-login and invalid-login scenarios inside the same test when navigation changes the page.
15. The output must be a complete runnable .spec.js file.
`.trim();
}

async function generateCodeWithGroq({
  websiteUrl,
  testCase
}) {
  const groq = getGroqClient();

  const response =
    await groq.chat.completions.create({
      model: groqConfig.model,
      temperature:
        groqConfig.temperature ?? 0.2,
      max_tokens:
        groqConfig.maxTokens ?? 4096,
      messages: [
        {
          role: "system",
          content:
            "You generate complete Playwright JavaScript test files. Return only JavaScript code, never JSON and never Markdown."
        },
        {
          role: "user",
          content: buildTestCasePrompt({
            websiteUrl,
            testCase
          })
        }
      ]
    });

  const rawContent =
    extractGroqResponseText(response);

  if (!rawContent) {
    throw new Error(
      "Groq returned an empty Playwright test response."
    );
  }

  return removeMarkdownCodeFences(rawContent);
}

function escapeJavaScriptString(value) {
  return JSON.stringify(cleanText(value));
}

function buildFallbackTest({
  websiteUrl,
  testCase
}) {
  const testTitle =
    testCase.title || "Generated website test";

  const expectedText =
    testCase.expectedResult ||
    testCase.description ||
    testTitle;

  return `import { test, expect } from "@playwright/test";

test(${escapeJavaScriptString(testTitle)}, async ({ page }) => {
  await page.goto(${escapeJavaScriptString(websiteUrl)});

  await expect(page).toHaveURL(/.+/);
  await expect(page.locator("body")).toBeVisible();

  console.log("ASEA fallback test executed.");
  console.log("Expected result:", ${escapeJavaScriptString(expectedText)});
});
`;
}

function validateGeneratedCode(code) {
  if (!code) {
    return false;
  }

  const requiredPatterns = [
    /@playwright\/test/,
    /\btest\s*\(/,
    /page\.goto\s*\(/
  ];

  return requiredPatterns.every((pattern) =>
    pattern.test(code)
  );
}

async function generateSingleTestFile({
  websiteUrl,
  testCase,
  index
}) {
  let code = "";
  let generationSource = "groq";
  let generationError = null;

  try {
    code = await generateCodeWithGroq({
      websiteUrl,
      testCase
    });

    if (!validateGeneratedCode(code)) {
      throw new Error(
        "Generated response was not a valid Playwright test file."
      );
    }
  } catch (error) {
    generationSource = "fallback";
    generationError = error.message;

    console.warn(
      `Playwright generation fallback used for "${testCase.title}":`,
      error.message
    );

    code = buildFallbackTest({
      websiteUrl,
      testCase
    });
  }

  const uniqueId = uuidv4();

  const baseName = sanitizeFileName(
    `${index + 1}-${testCase.id}-${testCase.title}`
  );

  const fileName =
    `${baseName}-${uniqueId}.spec.js`;

  const filePath = path.join(
    GENERATED_TESTS_DIRECTORY,
    fileName
  );

  await fs.writeFile(
    filePath,
    code,
    "utf8"
  );

  return {
    testCaseId: testCase.id,
    title: testCase.title,
    fileName,
    filePath,
    generationSource,
    generationError
  };
}

export async function generatePlaywrightScripts({
  websiteUrl,
  testCaseData
}) {
  const cleanWebsiteUrl =
    cleanText(websiteUrl);

  if (!cleanWebsiteUrl) {
    throw new Error(
      "websiteUrl is required for Playwright test generation."
    );
  }

  const testCases =
    collectTestCases(testCaseData);

  if (testCases.length === 0) {
    throw new Error(
      "No test cases were found for Playwright generation."
    );
  }

  await fs.ensureDir(
    GENERATED_TESTS_DIRECTORY
  );

  const generatedFiles = [];

  for (
    let index = 0;
    index < testCases.length;
    index += 1
  ) {
    const generatedFile =
      await generateSingleTestFile({
        websiteUrl: cleanWebsiteUrl,
        testCase: testCases[index],
        index
      });

    generatedFiles.push(generatedFile);
  }

  const groqGeneratedFiles =
    generatedFiles.filter(
      (file) =>
        file.generationSource === "groq"
    ).length;

  const fallbackGeneratedFiles =
    generatedFiles.filter(
      (file) =>
        file.generationSource === "fallback"
    ).length;

  return {
    success: true,
    websiteUrl: cleanWebsiteUrl,
    outputDirectory:
      GENERATED_TESTS_DIRECTORY,
    totalTestCases: testCases.length,
    totalFiles: generatedFiles.length,
    groqGeneratedFiles,
    fallbackGeneratedFiles,
    files: generatedFiles,
    generatedAt:
      new Date().toISOString()
  };
}