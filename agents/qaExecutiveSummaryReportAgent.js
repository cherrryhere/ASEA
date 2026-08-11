import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generateQAExecutiveSummaryReports(summaryData) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const markdownPath = `reports/qa-executive-summary-report-${reportId}.md`;
  const excelPath = `reports/qa-executive-summary-report-${reportId}.xlsx`;

  await generateMarkdownReport(markdownPath, summaryData);
  await generateExcelReport(excelPath, summaryData);

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateMarkdownReport(markdownPath, summaryData) {
  const summary = summaryData.executiveSummary;
  const portfolio = summaryData.projectPortfolio;
  const performance = summaryData.qaPerformance;

  const content = `
# ASEA Executive QA Summary Report

## Executive Summary

| Field | Value |
|---|---|
| Overall QA Health | ${summary.overallHealth} |
| Risk Level | ${summary.riskLevel} |
| Total Projects | ${summary.totalProjects} |
| Total Runs | ${summary.totalRuns} |
| Completed Runs | ${summary.completedRuns} |
| Failed Runs | ${summary.failedRuns} |
| Average Pass Rate | ${summary.averagePassRate}% |
| Average Executed Tests | ${summary.averageExecutedTests} |
| Latest Run Status | ${summary.latestRunStatus} |
| Trend | ${summary.trend} |
| Generated At | ${summaryData.generatedAt} |

---

## Executive Narrative

${summary.executiveNarrative}

---

## Project Portfolio

| Field | Value |
|---|---|
| Total Projects | ${portfolio.totalProjects} |
| Active Projects | ${portfolio.statusCounts.active || 0} |
| Paused Projects | ${portfolio.statusCounts.paused || 0} |
| Archived Projects | ${portfolio.statusCounts.archived || 0} |
| Projects With Recent Failures | ${portfolio.projectsWithRecentFailures.length} |

---

## Best Run

${
  performance.bestRun
    ? `| Field | Value |
|---|---|
| Run ID | ${performance.bestRun.runId} |
| Website URL | ${performance.bestRun.websiteUrl} |
| Pass Rate | ${performance.bestRun.passRate}% |
| Passed | ${performance.bestRun.passed} |
| Failed | ${performance.bestRun.failed} |
| Completed At | ${performance.bestRun.completedAt} |`
    : "No best run available."
}

---

## Worst Run

${
  performance.worstRun
    ? `| Field | Value |
|---|---|
| Run ID | ${performance.worstRun.runId} |
| Website URL | ${performance.worstRun.websiteUrl} |
| Pass Rate | ${performance.worstRun.passRate}% |
| Passed | ${performance.worstRun.passed} |
| Failed | ${performance.worstRun.failed} |
| Completed At | ${performance.worstRun.completedAt} |`
    : "No worst run available."
}

---

## Top Risks

${summaryData.risks
  .map(
    (risk, index) => `
### ${index + 1}. ${risk.title}

| Field | Value |
|---|---|
| Severity | ${risk.severity} |
| Reason | ${risk.reason} |
| Recommendation | ${risk.recommendation} |
`
  )
  .join("\n")}

---

## Priority Actions

${summaryData.priorityActions
  .map((action, index) => `${index + 1}. ${action}`)
  .join("\n")}

---

## Interview Pitch

### One Line

${summaryData.interviewPitch.oneLine}

### Technical Value

${summaryData.interviewPitch.technicalValue}

### Business Value

${summaryData.interviewPitch.businessValue}
`;

  await fs.writeFile(markdownPath, content);
}

async function generateExcelReport(excelPath, summaryData) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const summary = summaryData.executiveSummary;
  const portfolio = summaryData.projectPortfolio;
  const performance = summaryData.qaPerformance;

  const summarySheet = workbook.addWorksheet("Executive Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 40 },
    { header: "Value", key: "value", width: 120 }
  ];

  summarySheet.addRows([
    { field: "Overall QA Health", value: summary.overallHealth },
    { field: "Risk Level", value: summary.riskLevel },
    { field: "Executive Narrative", value: summary.executiveNarrative },
    { field: "Total Projects", value: summary.totalProjects },
    { field: "Total Runs", value: summary.totalRuns },
    { field: "Completed Runs", value: summary.completedRuns },
    { field: "Failed Runs", value: summary.failedRuns },
    { field: "Average Pass Rate", value: `${summary.averagePassRate}%` },
    { field: "Average Executed Tests", value: summary.averageExecutedTests },
    { field: "Latest Run Status", value: summary.latestRunStatus },
    { field: "Trend", value: summary.trend },
    { field: "Generated At", value: summaryData.generatedAt }
  ]);

  const projectsSheet = workbook.addWorksheet("Project Portfolio");

  projectsSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Project ID", key: "projectId", width: 45 },
    { header: "Name", key: "name", width: 45 },
    { header: "Website URL", key: "websiteUrl", width: 70 },
    { header: "Status", key: "status", width: 20 },
    { header: "Total Runs", key: "totalRuns", width: 15 },
    { header: "Last Run Status", key: "lastRunStatus", width: 20 },
    { header: "Last Pass Rate", key: "lastPassRate", width: 20 },
    { header: "Last Total Tests", key: "lastTotalTests", width: 20 },
    { header: "Last Passed Tests", key: "lastPassedTests", width: 20 },
    { header: "Last Failed Tests", key: "lastFailedTests", width: 20 },
    { header: "Last Run At", key: "lastRunAt", width: 35 }
  ];

  if (portfolio.projects.length > 0) {
    projectsSheet.addRows(
      portfolio.projects.map((project, index) => ({
        no: index + 1,
        projectId: project.projectId,
        name: project.name,
        websiteUrl: project.websiteUrl,
        status: project.status,
        totalRuns: project.totalRuns,
        lastRunStatus: project.lastRunStatus || "",
        lastPassRate:
          project.lastPassRate || project.lastPassRate === 0
            ? `${project.lastPassRate}%`
            : "",
        lastTotalTests: project.lastTotalTests,
        lastPassedTests: project.lastPassedTests,
        lastFailedTests: project.lastFailedTests,
        lastRunAt: project.lastRunAt || ""
      }))
    );
  } else {
    projectsSheet.addRow({
      no: 1,
      name: "No QA projects available"
    });
  }

  const risksSheet = workbook.addWorksheet("Top Risks");

  risksSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Risk", key: "title", width: 50 },
    { header: "Severity", key: "severity", width: 20 },
    { header: "Reason", key: "reason", width: 100 },
    { header: "Recommendation", key: "recommendation", width: 120 }
  ];

  risksSheet.addRows(
    summaryData.risks.map((risk, index) => ({
      no: index + 1,
      title: risk.title,
      severity: risk.severity,
      reason: risk.reason,
      recommendation: risk.recommendation
    }))
  );

  const actionsSheet = workbook.addWorksheet("Priority Actions");

  actionsSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Action", key: "action", width: 140 }
  ];

  actionsSheet.addRows(
    summaryData.priorityActions.map((action, index) => ({
      no: index + 1,
      action
    }))
  );

  const performanceSheet = workbook.addWorksheet("QA Performance");

  performanceSheet.columns = [
    { header: "Category", key: "category", width: 25 },
    { header: "Run ID", key: "runId", width: 45 },
    { header: "Website URL", key: "websiteUrl", width: 70 },
    { header: "Pass Rate", key: "passRate", width: 20 },
    { header: "Passed", key: "passed", width: 15 },
    { header: "Failed", key: "failed", width: 15 },
    { header: "Completed At", key: "completedAt", width: 35 }
  ];

  if (performance.bestRun) {
    performanceSheet.addRow({
      category: "Best Run",
      runId: performance.bestRun.runId,
      websiteUrl: performance.bestRun.websiteUrl,
      passRate: `${performance.bestRun.passRate}%`,
      passed: performance.bestRun.passed,
      failed: performance.bestRun.failed,
      completedAt: performance.bestRun.completedAt
    });
  }

  if (performance.worstRun) {
    performanceSheet.addRow({
      category: "Worst Run",
      runId: performance.worstRun.runId,
      websiteUrl: performance.worstRun.websiteUrl,
      passRate: `${performance.worstRun.passRate}%`,
      passed: performance.worstRun.passed,
      failed: performance.worstRun.failed,
      completedAt: performance.worstRun.completedAt
    });
  }

  const pitchSheet = workbook.addWorksheet("Interview Pitch");

  pitchSheet.columns = [
    { header: "Field", key: "field", width: 35 },
    { header: "Value", key: "value", width: 140 }
  ];

  pitchSheet.addRows([
    { field: "One Line", value: summaryData.interviewPitch.oneLine },
    { field: "Technical Value", value: summaryData.interviewPitch.technicalValue },
    { field: "Business Value", value: summaryData.interviewPitch.businessValue }
  ]);

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