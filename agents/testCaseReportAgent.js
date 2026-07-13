import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

const REPORTS_DIRECTORY = "reports";

function cleanText(value) {
  return String(value ?? "").trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractTestCases(testCaseData) {
  if (Array.isArray(testCaseData)) {
    return testCaseData;
  }

  if (!testCaseData || typeof testCaseData !== "object") {
    return [];
  }

  const possibleCollections = [
    testCaseData.testCases,
    testCaseData.generatedTestCases,
    testCaseData.cases,
    testCaseData.data?.testCases,
    testCaseData.data?.generatedTestCases,
    testCaseData.result?.testCases,
    testCaseData.result?.generatedTestCases
  ];

  for (const collection of possibleCollections) {
    if (Array.isArray(collection)) {
      return collection;
    }
  }

  return [];
}

function normalizePreconditions(preconditions) {
  if (Array.isArray(preconditions)) {
    return preconditions
      .map((item) => cleanText(item))
      .filter(Boolean);
  }

  const cleanValue = cleanText(preconditions);

  return cleanValue ? [cleanValue] : [];
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map((step, index) => {
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

      action: cleanText(
        step?.action ||
          step?.instruction ||
          step?.description ||
          ""
      ),

      expectedResult: cleanText(
        step?.expectedResult ||
          step?.expected ||
          step?.result ||
          ""
      )
    };
  });
}

function normalizeTestData(testData) {
  if (!testData) {
    return "";
  }

  if (typeof testData === "string") {
    return cleanText(testData);
  }

  try {
    return JSON.stringify(testData, null, 2);
  } catch {
    return cleanText(testData);
  }
}

function normalizeTestCase(testCase, index) {
  return {
    testCaseId:
      cleanText(
        testCase?.testCaseId ||
          testCase?.id ||
          testCase?.testId
      ) || `TC-${index + 1}`,

    featureId: cleanText(
      testCase?.featureId || ""
    ),

    featureName: cleanText(
      testCase?.featureName ||
        testCase?.feature ||
        ""
    ),

    title:
      cleanText(
        testCase?.title ||
          testCase?.testTitle ||
          testCase?.name
      ) || `Test Case ${index + 1}`,

    description: cleanText(
      testCase?.description ||
        testCase?.objective ||
        ""
    ),

    type:
      cleanText(
        testCase?.type ||
          testCase?.testType ||
          testCase?.category
      ) || "functional",

    priority:
      cleanText(testCase?.priority) ||
      "Medium",

    preconditions: normalizePreconditions(
      testCase?.preconditions ||
        testCase?.prerequisites
    ),

    testData: normalizeTestData(
      testCase?.testData ||
        testCase?.data
    ),

    steps: normalizeSteps(
      testCase?.steps ||
        testCase?.testSteps
    ),

    expectedResult: cleanText(
      testCase?.expectedResult ||
        testCase?.expectedOutcome ||
        testCase?.expected ||
        ""
    ),

    selectors: safeArray(
      testCase?.selectors
    ).map((selector) =>
      cleanText(selector)
    ),

    generationSource:
      cleanText(
        testCase?.generationSource
      ) || "unknown",

    generationError: cleanText(
      testCase?.generationError || ""
    )
  };
}

function escapeMarkdown(value) {
  return cleanText(value)
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br>");
}

function buildStepsMarkdown(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return "No test steps available.";
  }

  const rows = steps
    .map(
      (step) =>
        `| ${step.stepNumber} | ${escapeMarkdown(
          step.action
        )} | ${escapeMarkdown(
          step.expectedResult
        )} |`
    )
    .join("\n");

  return `
| Step | Action | Expected Result |
|---:|---|---|
${rows}
`.trim();
}

function buildPreconditionsMarkdown(preconditions) {
  if (
    !Array.isArray(preconditions) ||
    preconditions.length === 0
  ) {
    return "No preconditions specified.";
  }

  return preconditions
    .map(
      (precondition, index) =>
        `${index + 1}. ${precondition}`
    )
    .join("\n");
}

function buildSelectorsMarkdown(selectors) {
  if (
    !Array.isArray(selectors) ||
    selectors.length === 0
  ) {
    return "No selectors recorded.";
  }

  return selectors
    .map(
      (selector, index) =>
        `${index + 1}. \`${selector}\``
    )
    .join("\n");
}

async function generateMarkdownReport({
  filePath,
  testCases,
  metadata
}) {
  const testCaseSections = testCases
    .map(
      (testCase, index) => `
## ${index + 1}. ${testCase.title}

| Field | Value |
|---|---|
| Test Case ID | ${escapeMarkdown(testCase.testCaseId)} |
| Feature ID | ${escapeMarkdown(testCase.featureId || "Not specified")} |
| Feature Name | ${escapeMarkdown(testCase.featureName || "Not specified")} |
| Type | ${escapeMarkdown(testCase.type)} |
| Priority | ${escapeMarkdown(testCase.priority)} |
| Generation Source | ${escapeMarkdown(testCase.generationSource)} |

### Description

${testCase.description || "No description available."}

### Preconditions

${buildPreconditionsMarkdown(testCase.preconditions)}

### Test Data

\`\`\`json
${testCase.testData || "{}"}
\`\`\`

### Test Steps

${buildStepsMarkdown(testCase.steps)}

### Overall Expected Result

${testCase.expectedResult || "No expected result specified."}

### Selectors

${buildSelectorsMarkdown(testCase.selectors)}

${
  testCase.generationError
    ? `### Generation Warning

\`\`\`text
${testCase.generationError}
\`\`\``
    : ""
}

---
`
    )
    .join("\n");

  const markdownContent = `# ASEA Test Case Report

## Report Summary

| Field | Value |
|---|---|
| Total Test Cases | ${testCases.length} |
| Groq Generated | ${metadata.groqGeneratedCount} |
| Fallback Generated | ${metadata.fallbackGeneratedCount} |
| Generated At | ${metadata.generatedAt} |

---

${testCaseSections || "No test cases were available for this report."}
`;

  await fs.writeFile(
    filePath,
    markdownContent,
    "utf8"
  );
}

function styleWorksheetHeader(worksheet) {
  const headerRow = worksheet.getRow(1);

  headerRow.font = {
    bold: true
  };

  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true
  };

  headerRow.height = 30;

  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });
}

function styleWorksheetRows(worksheet) {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "top",
        wrapText: true
      };

      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });
  });
}

async function generateExcelReport({
  filePath,
  testCases,
  metadata
}) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const summarySheet =
    workbook.addWorksheet("Summary");

  summarySheet.columns = [
    {
      header: "Field",
      key: "field",
      width: 35
    },
    {
      header: "Value",
      key: "value",
      width: 70
    }
  ];

  summarySheet.addRows([
    {
      field: "Total Test Cases",
      value: testCases.length
    },
    {
      field: "Groq Generated",
      value: metadata.groqGeneratedCount
    },
    {
      field: "Fallback Generated",
      value: metadata.fallbackGeneratedCount
    },
    {
      field: "Generated At",
      value: metadata.generatedAt
    }
  ]);

  styleWorksheetHeader(summarySheet);
  styleWorksheetRows(summarySheet);

  const testCasesSheet =
    workbook.addWorksheet("Test Cases");

  testCasesSheet.columns = [
    {
      header: "No",
      key: "number",
      width: 8
    },
    {
      header: "Test Case ID",
      key: "testCaseId",
      width: 25
    },
    {
      header: "Feature ID",
      key: "featureId",
      width: 25
    },
    {
      header: "Feature Name",
      key: "featureName",
      width: 35
    },
    {
      header: "Title",
      key: "title",
      width: 55
    },
    {
      header: "Description",
      key: "description",
      width: 70
    },
    {
      header: "Type",
      key: "type",
      width: 20
    },
    {
      header: "Priority",
      key: "priority",
      width: 15
    },
    {
      header: "Preconditions",
      key: "preconditions",
      width: 60
    },
    {
      header: "Test Data",
      key: "testData",
      width: 60
    },
    {
      header: "Expected Result",
      key: "expectedResult",
      width: 70
    },
    {
      header: "Selectors",
      key: "selectors",
      width: 60
    },
    {
      header: "Generation Source",
      key: "generationSource",
      width: 20
    },
    {
      header: "Generation Error",
      key: "generationError",
      width: 80
    }
  ];

  testCases.forEach((testCase, index) => {
    testCasesSheet.addRow({
      number: index + 1,
      testCaseId: testCase.testCaseId,
      featureId: testCase.featureId,
      featureName: testCase.featureName,
      title: testCase.title,
      description: testCase.description,
      type: testCase.type,
      priority: testCase.priority,
      preconditions:
        testCase.preconditions.join("\n"),
      testData: testCase.testData,
      expectedResult:
        testCase.expectedResult,
      selectors:
        testCase.selectors.join("\n"),
      generationSource:
        testCase.generationSource,
      generationError:
        testCase.generationError
    });
  });

  styleWorksheetHeader(testCasesSheet);
  styleWorksheetRows(testCasesSheet);

  const stepsSheet =
    workbook.addWorksheet("Test Steps");

  stepsSheet.columns = [
    {
      header: "Test Case ID",
      key: "testCaseId",
      width: 25
    },
    {
      header: "Test Case Title",
      key: "testCaseTitle",
      width: 55
    },
    {
      header: "Step Number",
      key: "stepNumber",
      width: 15
    },
    {
      header: "Action",
      key: "action",
      width: 80
    },
    {
      header: "Expected Result",
      key: "expectedResult",
      width: 80
    }
  ];

  testCases.forEach((testCase) => {
    if (testCase.steps.length === 0) {
      stepsSheet.addRow({
        testCaseId: testCase.testCaseId,
        testCaseTitle: testCase.title,
        stepNumber: "",
        action: "No test steps available",
        expectedResult: ""
      });

      return;
    }

    testCase.steps.forEach((step) => {
      stepsSheet.addRow({
        testCaseId: testCase.testCaseId,
        testCaseTitle: testCase.title,
        stepNumber: step.stepNumber,
        action: step.action,
        expectedResult:
          step.expectedResult
      });
    });
  });

  styleWorksheetHeader(stepsSheet);
  styleWorksheetRows(stepsSheet);

  await workbook.xlsx.writeFile(filePath);
}

export async function generateTestCaseReports(
  testCaseData
) {
  await fs.ensureDir(REPORTS_DIRECTORY);

  const rawTestCases =
    extractTestCases(testCaseData);

  const normalizedTestCases =
    rawTestCases.map(normalizeTestCase);

  const reportId = uuidv4();

  const markdownPath =
    `${REPORTS_DIRECTORY}/test-case-report-${reportId}.md`;

  const excelPath =
    `${REPORTS_DIRECTORY}/test-case-report-${reportId}.xlsx`;

  const metadata = {
    totalTestCases:
      normalizedTestCases.length,

    groqGeneratedCount:
      Number(
        testCaseData?.groqGeneratedCount
      ) ||
      normalizedTestCases.filter(
        (testCase) =>
          testCase.generationSource === "groq"
      ).length,

    fallbackGeneratedCount:
      Number(
        testCaseData?.fallbackGeneratedCount
      ) ||
      normalizedTestCases.filter(
        (testCase) =>
          testCase.generationSource ===
          "fallback"
      ).length,

    generatedAt:
      testCaseData?.generatedAt ||
      new Date().toISOString()
  };

  await generateMarkdownReport({
    filePath: markdownPath,
    testCases: normalizedTestCases,
    metadata
  });

  await generateExcelReport({
    filePath: excelPath,
    testCases: normalizedTestCases,
    metadata
  });

  return {
    success: true,
    reportId,
    totalTestCases:
      normalizedTestCases.length,
    markdownPath,
    excelPath,
    generatedAt:
      new Date().toISOString()
  };
}