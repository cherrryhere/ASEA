import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generatePlatformReadinessReports(readinessData) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const markdownPath =
    `reports/platform-readiness-report-${reportId}.md`;
  const excelPath =
    `reports/platform-readiness-report-${reportId}.xlsx`;

  await generateMarkdownReport(markdownPath, readinessData);
  await generateExcelReport(excelPath, readinessData);

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateMarkdownReport(markdownPath, readinessData) {
  const platform = readinessData.platform;
  const readiness = readinessData.readiness;
  const storage = readinessData.storageMetrics;
  const apiCatalog = readinessData.apiCatalog;

  const content = `
# ASEA v3.0 Platform Readiness Report

## Platform Overview

| Field | Value |
|---|---|
| Name | ${platform.name} |
| Full Name | ${platform.fullName} |
| Version | ${platform.version} |
| Stage | ${platform.stage} |
| AI Provider | ${platform.aiProvider} |
| AI Model | ${platform.model} |
| Generated At | ${readinessData.generatedAt} |

---

## Readiness Summary

| Field | Value |
|---|---|
| Readiness Score | ${readiness.score}% |
| Readiness Status | ${readiness.status} |

---

## Storage Metrics

| Field | Value |
|---|---|
| Total Projects | ${storage.totalProjects} |
| Active Projects | ${storage.activeProjects} |
| Paused Projects | ${storage.pausedProjects} |
| Archived Projects | ${storage.archivedProjects} |
| Total Runs | ${storage.totalRuns} |
| Completed Runs | ${storage.completedRuns} |
| Failed Runs | ${storage.failedRuns} |

---

## API Catalog Summary

| Field | Value |
|---|---|
| Total APIs | ${apiCatalog.totalApis} |

${Object.entries(apiCatalog.groups)
  .map(
    ([group, count]) =>
      `| ${group} APIs | ${count} |`
  )
  .join("\n")}

---

## Recommendations

${readiness.recommendations
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

---

## Required File Checks

| File | Exists |
|---|---|
${readinessData.checks.files
  .map((item) => `| ${item.path} | ${item.exists ? "Yes" : "No"} |`)
  .join("\n")}

---

## Required Directory Checks

| Directory | Exists |
|---|---|
${readinessData.checks.directories
  .map((item) => `| ${item.path} | ${item.exists ? "Yes" : "No"} |`)
  .join("\n")}

---

## Environment Checks

| Key | Required | Configured |
|---|---|---|
${readinessData.checks.environment
  .map(
    (item) =>
      `| ${item.key} | ${item.required ? "Yes" : "No"} | ${item.configured ? "Yes" : "No"} |`
  )
  .join("\n")}

---

## Final Project Pitch

### One Line

${readinessData.finalProjectPitch.oneLine}

### Resume Bullet

${readinessData.finalProjectPitch.resumeBullet}

### Interview Explanation

${readinessData.finalProjectPitch.interviewExplanation}
`;

  await fs.writeFile(markdownPath, content);
}

async function generateExcelReport(excelPath, readinessData) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const platform = readinessData.platform;
  const readiness = readinessData.readiness;
  const storage = readinessData.storageMetrics;

  const summarySheet =
    workbook.addWorksheet("Platform Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 45 },
    { header: "Value", key: "value", width: 120 }
  ];

  summarySheet.addRows([
    { field: "Name", value: platform.name },
    { field: "Full Name", value: platform.fullName },
    { field: "Version", value: platform.version },
    { field: "Stage", value: platform.stage },
    { field: "AI Provider", value: platform.aiProvider },
    { field: "AI Model", value: platform.model },
    { field: "Readiness Score", value: `${readiness.score}%` },
    { field: "Readiness Status", value: readiness.status },
    { field: "Generated At", value: readinessData.generatedAt },
    { field: "One Line", value: readinessData.finalProjectPitch.oneLine },
    { field: "Resume Bullet", value: readinessData.finalProjectPitch.resumeBullet },
    { field: "Interview Explanation", value: readinessData.finalProjectPitch.interviewExplanation }
  ]);

  const storageSheet =
    workbook.addWorksheet("Storage Metrics");

  storageSheet.columns = [
    { header: "Metric", key: "metric", width: 45 },
    { header: "Value", key: "value", width: 40 }
  ];

  storageSheet.addRows([
    { metric: "Total Projects", value: storage.totalProjects },
    { metric: "Active Projects", value: storage.activeProjects },
    { metric: "Paused Projects", value: storage.pausedProjects },
    { metric: "Archived Projects", value: storage.archivedProjects },
    { metric: "Total Runs", value: storage.totalRuns },
    { metric: "Completed Runs", value: storage.completedRuns },
    { metric: "Failed Runs", value: storage.failedRuns }
  ]);

  const apiSheet =
    workbook.addWorksheet("API Catalog");

  apiSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Group", key: "group", width: 30 },
    { header: "Method", key: "method", width: 15 },
    { header: "Path", key: "path", width: 55 },
    { header: "Description", key: "description", width: 120 }
  ];

  apiSheet.addRows(
    readinessData.apiCatalog.apis.map((api, index) => ({
      no: index + 1,
      group: api.group,
      method: api.method,
      path: api.path,
      description: api.description
    }))
  );

  const fileSheet =
    workbook.addWorksheet("File Checks");

  fileSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "File", key: "path", width: 60 },
    { header: "Exists", key: "exists", width: 15 }
  ];

  fileSheet.addRows(
    readinessData.checks.files.map((item, index) => ({
      no: index + 1,
      path: item.path,
      exists: item.exists ? "Yes" : "No"
    }))
  );

  const directorySheet =
    workbook.addWorksheet("Directory Checks");

  directorySheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Directory", key: "path", width: 60 },
    { header: "Exists", key: "exists", width: 15 }
  ];

  directorySheet.addRows(
    readinessData.checks.directories.map((item, index) => ({
      no: index + 1,
      path: item.path,
      exists: item.exists ? "Yes" : "No"
    }))
  );

  const envSheet =
    workbook.addWorksheet("Environment Checks");

  envSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Key", key: "key", width: 35 },
    { header: "Required", key: "required", width: 20 },
    { header: "Configured", key: "configured", width: 20 },
    { header: "Value", key: "value", width: 60 }
  ];

  envSheet.addRows(
    readinessData.checks.environment.map((item, index) => ({
      no: index + 1,
      key: item.key,
      required: item.required ? "Yes" : "No",
      configured: item.configured ? "Yes" : "No",
      value: item.value || ""
    }))
  );

  const recommendationSheet =
    workbook.addWorksheet("Recommendations");

  recommendationSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Recommendation", key: "recommendation", width: 140 }
  ];

  recommendationSheet.addRows(
    readiness.recommendations.map((recommendation, index) => ({
      no: index + 1,
      recommendation
    }))
  );

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