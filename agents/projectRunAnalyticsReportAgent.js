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

function escapeMarkdown(value) {
  return cleanText(value)
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br>");
}

function formatPercentage(value) {
  const numericValue = Number(value || 0);

  return `${numericValue.toFixed(2)}%`;
}

function formatNumber(value) {
  const numericValue = Number(value || 0);

  return Number.isInteger(numericValue)
    ? numericValue
    : Number(numericValue.toFixed(2));
}

function formatRunStatus(run) {
  return cleanText(run?.status) || "unknown";
}

function buildRunTable(runs) {
  if (runs.length === 0) {
    return "No project runs are available.";
  }

  const rows = runs
    .map(
      (run) =>
        `| ${run.sequence || "-"} | ${escapeMarkdown(
          run.runId
        )} | ${escapeMarkdown(
          formatRunStatus(run)
        )} | ${formatPercentage(
          run.passRate
        )} | ${formatNumber(
          run.totalTests
        )} | ${formatNumber(
          run.passed
        )} | ${formatNumber(
          run.failed
        )} | ${formatNumber(
          run.durationSeconds
        )} | ${escapeMarkdown(
          run.completedAt
        )} |`
    )
    .join("\n");

  return `
| Sequence | Run ID | Status | Pass Rate | Total Tests | Passed | Failed | Duration Seconds | Completed At |
|---:|---|---|---:|---:|---:|---:|---:|---|
${rows}
`.trim();
}

function buildSingleRunSection(title, run) {
  if (!run) {
    return `## ${title}

No run information is available.
`;
  }

  return `## ${title}

| Field | Value |
|---|---|
| Run ID | ${escapeMarkdown(run.runId)} |
| Status | ${escapeMarkdown(formatRunStatus(run))} |
| Pass Rate | ${formatPercentage(run.passRate)} |
| Total Tests | ${formatNumber(run.totalTests)} |
| Passed | ${formatNumber(run.passed)} |
| Failed | ${formatNumber(run.failed)} |
| Duration Seconds | ${formatNumber(run.durationSeconds)} |
| Completed At | ${escapeMarkdown(run.completedAt)} |
`;
}

async function generateMarkdownReport({
  filePath,
  project,
  analytics
}) {
  const summary = analytics?.summary || {};
  const runTrend = safeArray(analytics?.runTrend);
  const recentRuns = safeArray(analytics?.recentRuns);

  const content = `# ASEA Project Analytics Report

## Project Information

| Field | Value |
|---|---|
| Project ID | ${escapeMarkdown(project.projectId)} |
| Project Name | ${escapeMarkdown(project.name)} |
| Website URL | ${escapeMarkdown(project.websiteUrl)} |
| Description | ${escapeMarkdown(project.description || "Not specified")} |
| Project Status | ${escapeMarkdown(project.status)} |
| Total Project Runs | ${formatNumber(project.totalRuns)} |
| Last Run At | ${escapeMarkdown(project.lastRunAt || "Not available")} |

---

## Analytics Summary

| Field | Value |
|---|---|
| Total Saved Runs | ${formatNumber(summary.totalRuns)} |
| Completed Runs | ${formatNumber(summary.completedRuns)} |
| Failed Runs | ${formatNumber(summary.failedRuns)} |
| Average Pass Rate | ${formatPercentage(summary.averagePassRate)} |
| Average Executed Tests | ${formatNumber(summary.averageExecutedTests)} |
| Average Passed Tests | ${formatNumber(summary.averagePassedTests)} |
| Average Failed Tests | ${formatNumber(summary.averageFailedTests)} |
| Average Duration Seconds | ${formatNumber(summary.averageDurationSeconds)} |
| Trend | ${escapeMarkdown(summary.trend || "Not Enough Data")} |
| Trend Difference | ${formatPercentage(summary.trendDifference)} |
| Analyzed At | ${escapeMarkdown(summary.analyzedAt)} |

---

${buildSingleRunSection("Latest Run", analytics?.latestRun)}

---

${buildSingleRunSection("Best Run", analytics?.bestRun)}

---

${buildSingleRunSection("Worst Run", analytics?.worstRun)}

---

## Pass-Rate Trend

${buildRunTable(runTrend)}

---

## Recent Runs

${buildRunTable(
  recentRuns.map((run, index) => ({
    sequence: index + 1,
    ...run
  }))
)}
`;

  await fs.writeFile(filePath, content, "utf8");
}

function styleHeader(worksheet) {
  const headerRow = worksheet.getRow(1);

  headerRow.font = {
    bold: true
  };

  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true
  };

  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });
}

function styleRows(worksheet) {
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

function addRunRows(worksheet, runs) {
  runs.forEach((run, index) => {
    worksheet.addRow({
      sequence: run.sequence || index + 1,
      runId: run.runId || "",
      status: formatRunStatus(run),
      passRate: Number(run.passRate || 0),
      totalTests: Number(run.totalTests || 0),
      passed: Number(run.passed || 0),
      failed: Number(run.failed || 0),
      durationSeconds: Number(run.durationSeconds || 0),
      completedAt: run.completedAt || ""
    });
  });
}

async function generateExcelReport({
  filePath,
  project,
  analytics
}) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const summary = analytics?.summary || {};

  const projectSheet =
    workbook.addWorksheet("Project Summary");

  projectSheet.columns = [
    {
      header: "Field",
      key: "field",
      width: 40
    },
    {
      header: "Value",
      key: "value",
      width: 100
    }
  ];

  projectSheet.addRows([
    {
      field: "Project ID",
      value: project.projectId
    },
    {
      field: "Project Name",
      value: project.name
    },
    {
      field: "Website URL",
      value: project.websiteUrl
    },
    {
      field: "Description",
      value: project.description || ""
    },
    {
      field: "Project Status",
      value: project.status
    },
    {
      field: "Project Total Runs",
      value: Number(project.totalRuns || 0)
    },
    {
      field: "Last Run At",
      value: project.lastRunAt || ""
    },
    {
      field: "Saved Run History Count",
      value: Number(summary.totalRuns || 0)
    },
    {
      field: "Completed Runs",
      value: Number(summary.completedRuns || 0)
    },
    {
      field: "Failed Runs",
      value: Number(summary.failedRuns || 0)
    },
    {
      field: "Average Pass Rate",
      value: Number(summary.averagePassRate || 0)
    },
    {
      field: "Average Executed Tests",
      value: Number(summary.averageExecutedTests || 0)
    },
    {
      field: "Average Passed Tests",
      value: Number(summary.averagePassedTests || 0)
    },
    {
      field: "Average Failed Tests",
      value: Number(summary.averageFailedTests || 0)
    },
    {
      field: "Average Duration Seconds",
      value: Number(summary.averageDurationSeconds || 0)
    },
    {
      field: "Trend",
      value: summary.trend || "Not Enough Data"
    },
    {
      field: "Trend Difference",
      value: Number(summary.trendDifference || 0)
    },
    {
      field: "Analyzed At",
      value: summary.analyzedAt || ""
    }
  ]);

  styleHeader(projectSheet);
  styleRows(projectSheet);

  const trendSheet =
    workbook.addWorksheet("Run Trend");

  trendSheet.columns = [
    {
      header: "Sequence",
      key: "sequence",
      width: 12
    },
    {
      header: "Run ID",
      key: "runId",
      width: 45
    },
    {
      header: "Status",
      key: "status",
      width: 18
    },
    {
      header: "Pass Rate",
      key: "passRate",
      width: 18
    },
    {
      header: "Total Tests",
      key: "totalTests",
      width: 18
    },
    {
      header: "Passed",
      key: "passed",
      width: 15
    },
    {
      header: "Failed",
      key: "failed",
      width: 15
    },
    {
      header: "Duration Seconds",
      key: "durationSeconds",
      width: 22
    },
    {
      header: "Completed At",
      key: "completedAt",
      width: 35
    }
  ];

  addRunRows(
    trendSheet,
    safeArray(analytics?.runTrend)
  );

  styleHeader(trendSheet);
  styleRows(trendSheet);

  const recentRunsSheet =
    workbook.addWorksheet("Recent Runs");

  recentRunsSheet.columns = [
    {
      header: "Sequence",
      key: "sequence",
      width: 12
    },
    {
      header: "Run ID",
      key: "runId",
      width: 45
    },
    {
      header: "Status",
      key: "status",
      width: 18
    },
    {
      header: "Pass Rate",
      key: "passRate",
      width: 18
    },
    {
      header: "Total Tests",
      key: "totalTests",
      width: 18
    },
    {
      header: "Passed",
      key: "passed",
      width: 15
    },
    {
      header: "Failed",
      key: "failed",
      width: 15
    },
    {
      header: "Duration Seconds",
      key: "durationSeconds",
      width: 22
    },
    {
      header: "Completed At",
      key: "completedAt",
      width: 35
    }
  ];

  addRunRows(
    recentRunsSheet,
    safeArray(analytics?.recentRuns)
  );

  styleHeader(recentRunsSheet);
  styleRows(recentRunsSheet);

  const importantRunsSheet =
    workbook.addWorksheet("Important Runs");

  importantRunsSheet.columns = [
    {
      header: "Category",
      key: "category",
      width: 20
    },
    {
      header: "Run ID",
      key: "runId",
      width: 45
    },
    {
      header: "Status",
      key: "status",
      width: 18
    },
    {
      header: "Pass Rate",
      key: "passRate",
      width: 18
    },
    {
      header: "Total Tests",
      key: "totalTests",
      width: 18
    },
    {
      header: "Passed",
      key: "passed",
      width: 15
    },
    {
      header: "Failed",
      key: "failed",
      width: 15
    },
    {
      header: "Completed At",
      key: "completedAt",
      width: 35
    }
  ];

  const importantRuns = [
    {
      category: "Latest",
      run: analytics?.latestRun
    },
    {
      category: "Best",
      run: analytics?.bestRun
    },
    {
      category: "Worst",
      run: analytics?.worstRun
    }
  ];

  importantRuns.forEach(({ category, run }) => {
    if (!run) {
      return;
    }

    importantRunsSheet.addRow({
      category,
      runId: run.runId || "",
      status: formatRunStatus(run),
      passRate: Number(run.passRate || 0),
      totalTests: Number(run.totalTests || 0),
      passed: Number(run.passed || 0),
      failed: Number(run.failed || 0),
      completedAt: run.completedAt || ""
    });
  });

  styleHeader(importantRunsSheet);
  styleRows(importantRunsSheet);

  await workbook.xlsx.writeFile(filePath);
}

export async function generateProjectRunAnalyticsReports({
  project,
  analytics
}) {
  if (!project?.projectId) {
    throw new Error(
      "A valid QA project is required to generate the analytics report."
    );
  }

  await fs.ensureDir(REPORTS_DIRECTORY);

  const reportId = uuidv4();

  const markdownPath =
    `${REPORTS_DIRECTORY}/project-analytics-report-${reportId}.md`;

  const excelPath =
    `${REPORTS_DIRECTORY}/project-analytics-report-${reportId}.xlsx`;

  await generateMarkdownReport({
    filePath: markdownPath,
    project,
    analytics
  });

  await generateExcelReport({
    filePath: excelPath,
    project,
    analytics
  });

  return {
    success: true,
    reportId,
    projectId: project.projectId,
    projectName: project.name,
    markdownPath,
    excelPath,
    generatedAt: new Date().toISOString()
  };
}