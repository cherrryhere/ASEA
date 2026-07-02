import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generateQAAnalyticsReports(analyticsData) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const markdownPath = `reports/qa-analytics-report-${reportId}.md`;
  const excelPath = `reports/qa-analytics-report-${reportId}.xlsx`;

  await generateMarkdownAnalyticsReport(markdownPath, analyticsData);
  await generateExcelAnalyticsReport(excelPath, analyticsData);

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateMarkdownAnalyticsReport(markdownPath, analyticsData) {
  const summary = analyticsData.summary;

  const content = `
# ASEA QA Run Analytics Report

## Overall Summary

| Field | Value |
|---|---|
| Total Runs | ${summary.totalRuns} |
| Completed Runs | ${summary.completedRuns} |
| Failed Runs | ${summary.failedRuns} |
| Average Pass Rate | ${summary.averagePassRate}% |
| Average Executed Tests | ${summary.averageExecutedTests} |
| Average Passed Tests | ${summary.averagePassedTests} |
| Average Failed Tests | ${summary.averageFailedTests} |
| Trend | ${summary.trend} |
| Latest Run Status | ${summary.latestRunStatus} |
| Analyzed At | ${summary.analyzedAt} |

---

## Best Run

${
  analyticsData.bestRun
    ? `| Field | Value |
|---|---|
| Run ID | ${analyticsData.bestRun.runId} |
| Website URL | ${analyticsData.bestRun.websiteUrl} |
| Pass Rate | ${analyticsData.bestRun.passRate}% |
| Passed | ${analyticsData.bestRun.passed} |
| Failed | ${analyticsData.bestRun.failed} |
| Completed At | ${analyticsData.bestRun.completedAt} |`
    : "No completed run available."
}

---

## Worst Run

${
  analyticsData.worstRun
    ? `| Field | Value |
|---|---|
| Run ID | ${analyticsData.worstRun.runId} |
| Website URL | ${analyticsData.worstRun.websiteUrl} |
| Pass Rate | ${analyticsData.worstRun.passRate}% |
| Passed | ${analyticsData.worstRun.passed} |
| Failed | ${analyticsData.worstRun.failed} |
| Completed At | ${analyticsData.worstRun.completedAt} |`
    : "No completed run available."
}

---

## Run Trend

${
  analyticsData.runTrend.length === 0
    ? "No trend data available."
    : analyticsData.runTrend
        .map(
          (run) =>
            `${run.sequence}. ${run.websiteUrl} — ${run.passRate}% pass rate, ${run.passed} passed, ${run.failed} failed`
        )
        .join("\n")
}

---

## Recent Runs

${
  analyticsData.recentRuns.length === 0
    ? "No recent runs available."
    : analyticsData.recentRuns
        .map(
          (run, index) => `
### ${index + 1}. ${run.websiteUrl}

| Field | Value |
|---|---|
| Run ID | ${run.runId} |
| Status | ${run.status} |
| Pass Rate | ${run.passRate}% |
| Passed | ${run.passed} |
| Failed | ${run.failed} |
| Duration Seconds | ${run.durationSeconds} |
| Completed At | ${run.completedAt} |
`
        )
        .join("\n")
}
`;

  await fs.writeFile(markdownPath, content);
}

async function generateExcelAnalyticsReport(excelPath, analyticsData) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const summary = analyticsData.summary;

  const summarySheet = workbook.addWorksheet("Analytics Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 40 },
    { header: "Value", key: "value", width: 100 }
  ];

  summarySheet.addRows([
    { field: "Total Runs", value: summary.totalRuns },
    { field: "Completed Runs", value: summary.completedRuns },
    { field: "Failed Runs", value: summary.failedRuns },
    { field: "Average Pass Rate", value: `${summary.averagePassRate}%` },
    { field: "Average Executed Tests", value: summary.averageExecutedTests },
    { field: "Average Passed Tests", value: summary.averagePassedTests },
    { field: "Average Failed Tests", value: summary.averageFailedTests },
    { field: "Trend", value: summary.trend },
    { field: "Latest Run Status", value: summary.latestRunStatus },
    { field: "Analyzed At", value: summary.analyzedAt }
  ]);

  const trendSheet = workbook.addWorksheet("Run Trend");

  trendSheet.columns = [
    { header: "Sequence", key: "sequence", width: 12 },
    { header: "Run ID", key: "runId", width: 45 },
    { header: "Website URL", key: "websiteUrl", width: 70 },
    { header: "Pass Rate", key: "passRate", width: 20 },
    { header: "Passed", key: "passed", width: 15 },
    { header: "Failed", key: "failed", width: 15 },
    { header: "Total Executed Tests", key: "totalExecutedTests", width: 25 },
    { header: "Completed At", key: "completedAt", width: 35 }
  ];

  trendSheet.addRows(
    analyticsData.runTrend.map((run) => ({
      sequence: run.sequence,
      runId: run.runId,
      websiteUrl: run.websiteUrl,
      passRate: `${run.passRate}%`,
      passed: run.passed,
      failed: run.failed,
      totalExecutedTests: run.totalExecutedTests,
      completedAt: run.completedAt
    }))
  );

  const recentSheet = workbook.addWorksheet("Recent Runs");

  recentSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Run ID", key: "runId", width: 45 },
    { header: "Website URL", key: "websiteUrl", width: 70 },
    { header: "Status", key: "status", width: 20 },
    { header: "Pass Rate", key: "passRate", width: 20 },
    { header: "Passed", key: "passed", width: 15 },
    { header: "Failed", key: "failed", width: 15 },
    { header: "Duration Seconds", key: "durationSeconds", width: 20 },
    { header: "Completed At", key: "completedAt", width: 35 },
    { header: "Error", key: "error", width: 100 }
  ];

  recentSheet.addRows(
    analyticsData.recentRuns.map((run, index) => ({
      no: index + 1,
      runId: run.runId,
      websiteUrl: run.websiteUrl,
      status: run.status,
      passRate: `${run.passRate}%`,
      passed: run.passed,
      failed: run.failed,
      durationSeconds: run.durationSeconds,
      completedAt: run.completedAt,
      error: run.error ? run.error.message : ""
    }))
  );

  const bestWorstSheet = workbook.addWorksheet("Best Worst Runs");

  bestWorstSheet.columns = [
    { header: "Category", key: "category", width: 20 },
    { header: "Run ID", key: "runId", width: 45 },
    { header: "Website URL", key: "websiteUrl", width: 70 },
    { header: "Pass Rate", key: "passRate", width: 20 },
    { header: "Passed", key: "passed", width: 15 },
    { header: "Failed", key: "failed", width: 15 },
    { header: "Completed At", key: "completedAt", width: 35 }
  ];

  if (analyticsData.bestRun) {
    bestWorstSheet.addRow({
      category: "Best",
      runId: analyticsData.bestRun.runId,
      websiteUrl: analyticsData.bestRun.websiteUrl,
      passRate: `${analyticsData.bestRun.passRate}%`,
      passed: analyticsData.bestRun.passed,
      failed: analyticsData.bestRun.failed,
      completedAt: analyticsData.bestRun.completedAt
    });
  }

  if (analyticsData.worstRun) {
    bestWorstSheet.addRow({
      category: "Worst",
      runId: analyticsData.worstRun.runId,
      websiteUrl: analyticsData.worstRun.websiteUrl,
      passRate: `${analyticsData.worstRun.passRate}%`,
      passed: analyticsData.worstRun.passed,
      failed: analyticsData.worstRun.failed,
      completedAt: analyticsData.worstRun.completedAt
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