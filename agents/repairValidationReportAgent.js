import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generateRepairValidationReports(validationData) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const markdownPath = `reports/repair-validation-report-${reportId}.md`;
  const excelPath = `reports/repair-validation-report-${reportId}.xlsx`;

  await generateMarkdownValidationReport(markdownPath, validationData);
  await generateExcelValidationReport(excelPath, validationData);

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateMarkdownValidationReport(markdownPath, validationData) {
  const content = `
# ASEA Repair Validation Report

## Validation Summary

| Field | Value |
|---|---|
| Validation Status | ${validationData.validationStatus} |
| Generated Files Count | ${validationData.generatedFilesCount} |
| Repaired Files Count | ${validationData.repairedFilesCount} |
| Before Repair Pass Rate | ${validationData.comparison.beforePassRate}% |
| After Repair Pass Rate | ${validationData.comparison.afterPassRate}% |
| Pass Rate Improvement | ${validationData.comparison.passRateImprovement}% |
| Passed Tests Improvement | ${validationData.comparison.passedImprovement} |
| Failed Tests Reduction | ${validationData.comparison.failedReduction} |
| Validated At | ${validationData.validatedAt} |

---

## Summary

${validationData.validationSummary}

---

## Before Repair

| Field | Value |
|---|---|
| Command | ${validationData.beforeRepair.command} |
| Total Tests | ${validationData.beforeRepair.summary.total} |
| Passed | ${validationData.beforeRepair.summary.passed} |
| Failed | ${validationData.beforeRepair.summary.failed} |
| Skipped | ${validationData.beforeRepair.summary.skipped} |
| Pass Rate | ${validationData.beforeRepair.summary.passRate}% |

---

## After Repair

| Field | Value |
|---|---|
| Command | ${validationData.afterRepair.command} |
| Total Tests | ${validationData.afterRepair.summary.total} |
| Passed | ${validationData.afterRepair.summary.passed} |
| Failed | ${validationData.afterRepair.summary.failed} |
| Skipped | ${validationData.afterRepair.summary.skipped} |
| Pass Rate | ${validationData.afterRepair.summary.passRate}% |

---

## Failed Tests After Repair

${
  validationData.afterRepair.testResults.filter((test) => test.status !== "passed")
    .length === 0
    ? "No failed tests after repair."
    : validationData.afterRepair.testResults
        .filter((test) => test.status !== "passed")
        .map(
          (test, index) => `
### ${index + 1}. ${test.testTitle}

| Field | Value |
|---|---|
| Status | ${test.status} |
| Duration | ${test.duration} ms |

#### Error

\`\`\`text
${test.errorMessage || "No error message"}
\`\`\`
`
        )
        .join("\n")
}
`;

  await fs.writeFile(markdownPath, content);
}

async function generateExcelValidationReport(excelPath, validationData) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Validation Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 40 },
    { header: "Value", key: "value", width: 100 }
  ];

  summarySheet.addRows([
    { field: "Validation Status", value: validationData.validationStatus },
    { field: "Validation Summary", value: validationData.validationSummary },
    { field: "Generated Files Count", value: validationData.generatedFilesCount },
    { field: "Repaired Files Count", value: validationData.repairedFilesCount },
    { field: "Before Repair Pass Rate", value: `${validationData.comparison.beforePassRate}%` },
    { field: "After Repair Pass Rate", value: `${validationData.comparison.afterPassRate}%` },
    { field: "Pass Rate Improvement", value: `${validationData.comparison.passRateImprovement}%` },
    { field: "Passed Tests Improvement", value: validationData.comparison.passedImprovement },
    { field: "Failed Tests Reduction", value: validationData.comparison.failedReduction },
    { field: "Validated At", value: validationData.validatedAt }
  ]);

  const comparisonSheet = workbook.addWorksheet("Before vs After");

  comparisonSheet.columns = [
    { header: "Metric", key: "metric", width: 35 },
    { header: "Before Repair", key: "before", width: 25 },
    { header: "After Repair", key: "after", width: 25 },
    { header: "Difference", key: "difference", width: 25 }
  ];

  comparisonSheet.addRows([
    {
      metric: "Total Tests",
      before: validationData.beforeRepair.summary.total,
      after: validationData.afterRepair.summary.total,
      difference:
        validationData.afterRepair.summary.total -
        validationData.beforeRepair.summary.total
    },
    {
      metric: "Passed",
      before: validationData.beforeRepair.summary.passed,
      after: validationData.afterRepair.summary.passed,
      difference:
        validationData.afterRepair.summary.passed -
        validationData.beforeRepair.summary.passed
    },
    {
      metric: "Failed",
      before: validationData.beforeRepair.summary.failed,
      after: validationData.afterRepair.summary.failed,
      difference:
        validationData.afterRepair.summary.failed -
        validationData.beforeRepair.summary.failed
    },
    {
      metric: "Skipped",
      before: validationData.beforeRepair.summary.skipped,
      after: validationData.afterRepair.summary.skipped,
      difference:
        validationData.afterRepair.summary.skipped -
        validationData.beforeRepair.summary.skipped
    },
    {
      metric: "Pass Rate",
      before: `${validationData.beforeRepair.summary.passRate}%`,
      after: `${validationData.afterRepair.summary.passRate}%`,
      difference: `${validationData.comparison.passRateImprovement}%`
    }
  ]);

  const afterResultsSheet = workbook.addWorksheet("After Repair Results");

  afterResultsSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Suite", key: "suite", width: 45 },
    { header: "Test Title", key: "testTitle", width: 70 },
    { header: "Status", key: "status", width: 20 },
    { header: "Duration ms", key: "duration", width: 20 },
    { header: "Error Message", key: "errorMessage", width: 120 }
  ];

  afterResultsSheet.addRows(
    validationData.afterRepair.testResults.map((test, index) => ({
      no: index + 1,
      suite: test.suite || "",
      testTitle: test.testTitle || "",
      status: test.status || "",
      duration: test.duration || 0,
      errorMessage: test.errorMessage || ""
    }))
  );

  const failedAfterSheet = workbook.addWorksheet("Failed After Repair");

  failedAfterSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Test Title", key: "testTitle", width: 70 },
    { header: "Status", key: "status", width: 20 },
    { header: "Error Message", key: "errorMessage", width: 120 },
    { header: "Error Stack", key: "errorStack", width: 120 }
  ];

  const failedAfter = validationData.afterRepair.testResults.filter(
    (test) => test.status !== "passed"
  );

  if (failedAfter.length > 0) {
    failedAfterSheet.addRows(
      failedAfter.map((test, index) => ({
        no: index + 1,
        testTitle: test.testTitle || "",
        status: test.status || "",
        errorMessage: test.errorMessage || "",
        errorStack: test.errorStack || ""
      }))
    );
  } else {
    failedAfterSheet.addRow({
      no: 1,
      testTitle: "No failed tests after repair",
      status: "passed",
      errorMessage: "All repaired tests passed",
      errorStack: ""
    });
  }

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