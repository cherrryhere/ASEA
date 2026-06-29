import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generateFailureAnalysisReports(failureAnalysis) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const markdownPath = `reports/failure-analysis-report-${reportId}.md`;
  const excelPath = `reports/failure-analysis-report-${reportId}.xlsx`;

  await generateMarkdownFailureReport(markdownPath, failureAnalysis);
  await generateExcelFailureReport(excelPath, failureAnalysis);

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateMarkdownFailureReport(markdownPath, failureAnalysis) {
  const failures = Array.isArray(failureAnalysis.failures)
    ? failureAnalysis.failures
    : [];

  const recommendations = Array.isArray(failureAnalysis.recommendations)
    ? failureAnalysis.recommendations
    : [];

  const content = `
# ASEA Failure Analysis Report

## Summary

| Field | Value |
|---|---|
| Total Failed Tests | ${failureAnalysis.totalFailedTests} |
| Analyzed At | ${failureAnalysis.analyzedAt} |

---

## Overall Summary

${failureAnalysis.overallSummary}

---

## Failure Details

${
  failures.length === 0
    ? "No failed tests found."
    : failures
        .map(
          (failure, index) => `
### ${index + 1}. ${failure.testTitle}

| Field | Value |
|---|---|
| Status | ${failure.status} |
| Failure Type | ${failure.failureType} |
| Priority | ${failure.priority} |
| Application Bug? | ${failure.isApplicationBug} |
| Test Script Issue? | ${failure.isTestScriptIssue} |

#### Root Cause

${failure.rootCause}

#### Technical Reason

${failure.technicalReason}

#### Suggested Fix

${failure.suggestedFix}
`
        )
        .join("\n")
}

---

## Recommendations

${
  recommendations.length === 0
    ? "No recommendations generated."
    : recommendations.map((item, index) => `${index + 1}. ${item}`).join("\n")
}
`;

  await fs.writeFile(markdownPath, content);
}

async function generateExcelFailureReport(excelPath, failureAnalysis) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Failure Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 35 },
    { header: "Value", key: "value", width: 100 }
  ];

  summarySheet.addRows([
    { field: "Total Failed Tests", value: failureAnalysis.totalFailedTests },
    { field: "Overall Summary", value: failureAnalysis.overallSummary },
    { field: "Analyzed At", value: failureAnalysis.analyzedAt }
  ]);

  const failuresSheet = workbook.addWorksheet("Failure Analysis");

  failuresSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Test Title", key: "testTitle", width: 60 },
    { header: "Status", key: "status", width: 20 },
    { header: "Failure Type", key: "failureType", width: 30 },
    { header: "Root Cause", key: "rootCause", width: 80 },
    { header: "Technical Reason", key: "technicalReason", width: 100 },
    { header: "Suggested Fix", key: "suggestedFix", width: 100 },
    { header: "Application Bug?", key: "isApplicationBug", width: 20 },
    { header: "Test Script Issue?", key: "isTestScriptIssue", width: 25 },
    { header: "Priority", key: "priority", width: 20 }
  ];

  const failures = Array.isArray(failureAnalysis.failures)
    ? failureAnalysis.failures
    : [];

  if (failures.length > 0) {
    failuresSheet.addRows(
      failures.map((failure, index) => ({
        no: index + 1,
        testTitle: failure.testTitle || "",
        status: failure.status || "",
        failureType: failure.failureType || "",
        rootCause: failure.rootCause || "",
        technicalReason: failure.technicalReason || "",
        suggestedFix: failure.suggestedFix || "",
        isApplicationBug: String(failure.isApplicationBug),
        isTestScriptIssue: String(failure.isTestScriptIssue),
        priority: failure.priority || ""
      }))
    );
  } else {
    failuresSheet.addRow({
      no: 1,
      testTitle: "No failed tests",
      status: "passed",
      failureType: "N/A",
      rootCause: "All tests passed",
      technicalReason: "N/A",
      suggestedFix: "N/A",
      isApplicationBug: "false",
      isTestScriptIssue: "false",
      priority: "Low"
    });
  }

  const recommendationsSheet = workbook.addWorksheet("Recommendations");

  recommendationsSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Recommendation", key: "recommendation", width: 120 }
  ];

  const recommendations = Array.isArray(failureAnalysis.recommendations)
    ? failureAnalysis.recommendations
    : [];

  if (recommendations.length > 0) {
    recommendationsSheet.addRows(
      recommendations.map((recommendation, index) => ({
        no: index + 1,
        recommendation
      }))
    );
  } else {
    recommendationsSheet.addRow({
      no: 1,
      recommendation: "No recommendations generated."
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