import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generateTestExecutionReports(executionData) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const markdownPath = `reports/test-execution-report-${reportId}.md`;
  const excelPath = `reports/test-execution-report-${reportId}.xlsx`;

  await generateMarkdownExecutionReport(markdownPath, executionData);
  await generateExcelExecutionReport(excelPath, executionData);

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateMarkdownExecutionReport(markdownPath, executionData) {
  const { summary, testResults } = executionData;

  const content = `
# ASEA Test Execution Report

## Execution Summary

| Field | Value |
|---|---|
| Command | ${executionData.command} |
| Exit Code | ${executionData.exitCode} |
| Total Tests | ${summary.total} |
| Passed | ${summary.passed} |
| Failed | ${summary.failed} |
| Skipped | ${summary.skipped} |
| Timed Out | ${summary.timedOut} |
| Interrupted | ${summary.interrupted} |
| Pass Rate | ${summary.passRate}% |
| Executed At | ${executionData.executedAt} |

---

## Test Results

${testResults
  .map(
    (test, index) => `
### ${index + 1}. ${test.testTitle}

| Field | Value |
|---|---|
| Suite | ${test.suite || "N/A"} |
| Status | ${test.status} |
| Duration | ${test.duration} ms |
| Retry | ${test.retry} |
| Worker Index | ${test.workerIndex} |

${
  test.errorMessage
    ? `#### Error Message

\`\`\`text
${test.errorMessage}
\`\`\`
`
    : ""
}

${
  test.errorStack
    ? `#### Error Stack

\`\`\`text
${test.errorStack}
\`\`\`
`
    : ""
}
`
  )
  .join("\n")}
`;

  await fs.writeFile(markdownPath, content);
}

async function generateExcelExecutionReport(excelPath, executionData) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const { summary, testResults } = executionData;

  const summarySheet = workbook.addWorksheet("Execution Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 35 },
    { header: "Value", key: "value", width: 100 }
  ];

  summarySheet.addRows([
    { field: "Command", value: executionData.command },
    { field: "Exit Code", value: executionData.exitCode },
    { field: "Total Tests", value: summary.total },
    { field: "Passed", value: summary.passed },
    { field: "Failed", value: summary.failed },
    { field: "Skipped", value: summary.skipped },
    { field: "Timed Out", value: summary.timedOut },
    { field: "Interrupted", value: summary.interrupted },
    { field: "Pass Rate", value: `${summary.passRate}%` },
    { field: "Executed At", value: executionData.executedAt }
  ]);

  const resultsSheet = workbook.addWorksheet("Test Results");

  resultsSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Suite", key: "suite", width: 45 },
    { header: "Test Title", key: "testTitle", width: 60 },
    { header: "Status", key: "status", width: 20 },
    { header: "Duration ms", key: "duration", width: 20 },
    { header: "Retry", key: "retry", width: 15 },
    { header: "Worker Index", key: "workerIndex", width: 20 },
    { header: "Error Message", key: "errorMessage", width: 100 }
  ];

  resultsSheet.addRows(
    testResults.map((test, index) => ({
      no: index + 1,
      suite: test.suite || "",
      testTitle: test.testTitle || "",
      status: test.status || "",
      duration: test.duration || 0,
      retry: test.retry || 0,
      workerIndex: test.workerIndex || 0,
      errorMessage: test.errorMessage || ""
    }))
  );

  const failedSheet = workbook.addWorksheet("Failed Tests");

  failedSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Test Title", key: "testTitle", width: 60 },
    { header: "Error Message", key: "errorMessage", width: 100 },
    { header: "Error Stack", key: "errorStack", width: 120 }
  ];

  const failedTests = testResults.filter((test) => test.status !== "passed");

  if (failedTests.length > 0) {
    failedSheet.addRows(
      failedTests.map((test, index) => ({
        no: index + 1,
        testTitle: test.testTitle || "",
        errorMessage: test.errorMessage || "",
        errorStack: test.errorStack || ""
      }))
    );
  } else {
    failedSheet.addRow({
      no: 1,
      testTitle: "No failed tests",
      errorMessage: "All tests passed",
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