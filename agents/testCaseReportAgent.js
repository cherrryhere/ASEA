import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generateTestCaseReports(testCaseData) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const markdownPath = `reports/test-case-report-${reportId}.md`;
  const excelPath = `reports/test-case-report-${reportId}.xlsx`;

  await generateTestCaseMarkdownReport(markdownPath, testCaseData);
  await generateTestCaseExcelReport(excelPath, testCaseData);

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateTestCaseMarkdownReport(markdownPath, testCaseData) {
  const content = `
# ASEA Test Case Generation Report

## Website Summary

| Field | Value |
|---|---|
| Website URL | ${testCaseData.websiteUrl} |
| Page Title | ${testCaseData.pageTitle} |
| Total Features | ${testCaseData.totalFeatures} |
| Total Test Cases | ${testCaseData.totalTestCases} |
| Generated At | ${testCaseData.generatedAt} |

---

## QA Summary

${testCaseData.qaSummary}

---

## Test Suites

${testCaseData.testSuites
  .map(
    (suite, suiteIndex) => `
## ${suiteIndex + 1}. ${suite.featureName}

| Field | Value |
|---|---|
| Feature Type | ${suite.featureType} |
| Priority | ${suite.priority} |
| Total Test Cases | ${
      Array.isArray(suite.testCases) ? suite.testCases.length : 0
    } |

${Array.isArray(suite.testCases)
  ? suite.testCases
      .map(
        (testCase, testIndex) => `
### ${suiteIndex + 1}.${testIndex + 1} ${testCase.title}

| Field | Value |
|---|---|
| Test Case ID | ${testCase.testCaseId} |
| Type | ${testCase.type} |
| Priority | ${testCase.priority} |
| Automation Feasibility | ${testCase.automationFeasibility} |

#### Preconditions

${
  Array.isArray(testCase.preconditions) && testCase.preconditions.length > 0
    ? testCase.preconditions
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n")
    : "No preconditions provided."
}

#### Steps

${
  Array.isArray(testCase.steps) && testCase.steps.length > 0
    ? testCase.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")
    : "No steps provided."
}

#### Expected Result

${testCase.expectedResult || "N/A"}

#### Test Data

${
  Array.isArray(testCase.testData) && testCase.testData.length > 0
    ? testCase.testData.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "No test data provided."
}
`
      )
      .join("\n")
  : "No test cases generated."}
`
  )
  .join("\n")}
`;

  await fs.writeFile(markdownPath, content);
}

async function generateTestCaseExcelReport(excelPath, testCaseData) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 35 },
    { header: "Value", key: "value", width: 100 }
  ];

  summarySheet.addRows([
    { field: "Website URL", value: testCaseData.websiteUrl },
    { field: "Page Title", value: testCaseData.pageTitle },
    { field: "Total Features", value: testCaseData.totalFeatures },
    { field: "Total Test Cases", value: testCaseData.totalTestCases },
    { field: "QA Summary", value: testCaseData.qaSummary },
    { field: "Generated At", value: testCaseData.generatedAt }
  ]);

  const suitesSheet = workbook.addWorksheet("Test Suites");

  suitesSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Feature Name", key: "featureName", width: 40 },
    { header: "Feature Type", key: "featureType", width: 25 },
    { header: "Priority", key: "priority", width: 20 },
    { header: "Test Case Count", key: "testCaseCount", width: 20 }
  ];

  suitesSheet.addRows(
    testCaseData.testSuites.map((suite, index) => ({
      no: index + 1,
      featureName: suite.featureName || "",
      featureType: suite.featureType || "",
      priority: suite.priority || "",
      testCaseCount: Array.isArray(suite.testCases)
        ? suite.testCases.length
        : 0
    }))
  );

  const testCasesSheet = workbook.addWorksheet("Test Cases");

  testCasesSheet.columns = [
    { header: "Feature Name", key: "featureName", width: 40 },
    { header: "Test Case ID", key: "testCaseId", width: 25 },
    { header: "Title", key: "title", width: 60 },
    { header: "Type", key: "type", width: 20 },
    { header: "Priority", key: "priority", width: 20 },
    { header: "Preconditions", key: "preconditions", width: 80 },
    { header: "Steps", key: "steps", width: 100 },
    { header: "Expected Result", key: "expectedResult", width: 80 },
    { header: "Test Data", key: "testData", width: 80 },
    { header: "Automation Feasibility", key: "automationFeasibility", width: 30 }
  ];

  const testCaseRows = [];

  testCaseData.testSuites.forEach((suite) => {
    if (Array.isArray(suite.testCases)) {
      suite.testCases.forEach((testCase) => {
        testCaseRows.push({
          featureName: suite.featureName || "",
          testCaseId: testCase.testCaseId || "",
          title: testCase.title || "",
          type: testCase.type || "",
          priority: testCase.priority || "",
          preconditions: Array.isArray(testCase.preconditions)
            ? testCase.preconditions.join("\n")
            : "",
          steps: Array.isArray(testCase.steps)
            ? testCase.steps.join("\n")
            : "",
          expectedResult: testCase.expectedResult || "",
          testData: Array.isArray(testCase.testData)
            ? testCase.testData.join("\n")
            : "",
          automationFeasibility: testCase.automationFeasibility || ""
        });
      });
    }
  });

  testCasesSheet.addRows(testCaseRows);

  const stepsSheet = workbook.addWorksheet("Test Steps");

  stepsSheet.columns = [
    { header: "Test Case ID", key: "testCaseId", width: 25 },
    { header: "Step No", key: "stepNo", width: 15 },
    { header: "Step", key: "step", width: 120 }
  ];

  const stepRows = [];

  testCaseData.testSuites.forEach((suite) => {
    if (Array.isArray(suite.testCases)) {
      suite.testCases.forEach((testCase) => {
        if (Array.isArray(testCase.steps)) {
          testCase.steps.forEach((step, index) => {
            stepRows.push({
              testCaseId: testCase.testCaseId || "",
              stepNo: index + 1,
              step
            });
          });
        }
      });
    }
  });

  stepsSheet.addRows(stepRows);

  workbook.eachSheet((sheet) => {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center"
    };

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = {
          vertical: "top",
          wrapText: true
        };
      });
    });
  });

  await workbook.xlsx.writeFile(excelPath);
}