import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generateTestRepairReports(repairData) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const markdownPath = `reports/test-repair-report-${reportId}.md`;
  const excelPath = `reports/test-repair-report-${reportId}.xlsx`;

  await generateMarkdownRepairReport(markdownPath, repairData);
  await generateExcelRepairReport(excelPath, repairData);

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateMarkdownRepairReport(markdownPath, repairData) {
  const files = Array.isArray(repairData.files) ? repairData.files : [];

  const content = `
# ASEA Self-Healing Test Repair Report

## Repair Summary

| Field | Value |
|---|---|
| Repaired | ${repairData.repaired} |
| Message | ${repairData.message} |
| Total Repaired Files | ${repairData.totalRepairedFiles} |
| Repaired At | ${repairData.repairedAt} |

---

## Summary

${repairData.repairSummary || "No repair summary available."}

---

## Repaired Files

${
  files.length === 0
    ? "No repaired files generated."
    : files
        .map(
          (file, index) => `
### ${index + 1}. ${file.repairedFileName}

| Field | Value |
|---|---|
| Original File | ${file.originalFileName} |
| Repaired File | ${file.repairedFileName} |
| Path | ${file.filePath} |
| Description | ${file.description} |

#### Changes Made

${
  Array.isArray(file.changesMade) && file.changesMade.length > 0
    ? file.changesMade.map((change, i) => `${i + 1}. ${change}`).join("\n")
    : "No changes listed."
}
`
        )
        .join("\n")
}
`;

  await fs.writeFile(markdownPath, content);
}

async function generateExcelRepairReport(excelPath, repairData) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Repair Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 35 },
    { header: "Value", key: "value", width: 100 }
  ];

  summarySheet.addRows([
    { field: "Repaired", value: String(repairData.repaired) },
    { field: "Message", value: repairData.message },
    { field: "Repair Summary", value: repairData.repairSummary || "" },
    { field: "Total Repaired Files", value: repairData.totalRepairedFiles },
    { field: "Repaired At", value: repairData.repairedAt }
  ]);

  const filesSheet = workbook.addWorksheet("Repaired Files");

  filesSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Original File", key: "originalFileName", width: 60 },
    { header: "Repaired File", key: "repairedFileName", width: 60 },
    { header: "File Path", key: "filePath", width: 80 },
    { header: "Description", key: "description", width: 100 },
    { header: "Changes Made", key: "changesMade", width: 120 }
  ];

  const files = Array.isArray(repairData.files) ? repairData.files : [];

  if (files.length > 0) {
    filesSheet.addRows(
      files.map((file, index) => ({
        no: index + 1,
        originalFileName: file.originalFileName || "",
        repairedFileName: file.repairedFileName || "",
        filePath: file.filePath || "",
        description: file.description || "",
        changesMade: Array.isArray(file.changesMade)
          ? file.changesMade.join("\n")
          : ""
      }))
    );
  } else {
    filesSheet.addRow({
      no: 1,
      originalFileName: "N/A",
      repairedFileName: "N/A",
      filePath: "N/A",
      description: "No repaired files generated.",
      changesMade: "N/A"
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