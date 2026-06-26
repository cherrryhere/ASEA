import ExcelJS from "exceljs";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

export async function generateExcelReport(knowledge) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const excelPath = `reports/inspection-report-${reportId}.xlsx`;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const buttons = knowledge.elements.filter((el) => el.tag === "button");
  const links = knowledge.elements.filter((el) => el.tag === "a");
  const inputs = knowledge.elements.filter(
    (el) => el.tag === "input" || el.tag === "textarea" || el.tag === "select"
  );

  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 30 },
    { header: "Value", key: "value", width: 80 }
  ];

  summarySheet.addRows([
    { field: "Website URL", value: knowledge.websiteUrl },
    { field: "Current URL", value: knowledge.currentUrl },
    { field: "Page Title", value: knowledge.pageTitle },
    { field: "Inspected At", value: knowledge.inspectedAt },
    { field: "Screenshot Path", value: knowledge.screenshotPath },
    { field: "Total UI Elements", value: knowledge.totalElements },
    { field: "Buttons", value: buttons.length },
    { field: "Links", value: links.length },
    { field: "Inputs / Textareas / Selects", value: inputs.length }
  ]);

  const elementsSheet = workbook.addWorksheet("UI Elements");

  elementsSheet.columns = [
    { header: "Tag", key: "tag", width: 15 },
    { header: "Text", key: "text", width: 40 },
    { header: "Placeholder", key: "placeholder", width: 30 },
    { header: "Type", key: "type", width: 20 },
    { header: "Name", key: "name", width: 25 },
    { header: "ID", key: "id", width: 25 },
    { header: "Class", key: "className", width: 40 },
    { header: "ARIA Label", key: "ariaLabel", width: 30 },
    { header: "Href", key: "href", width: 60 }
  ];

  elementsSheet.addRows(knowledge.elements);

  const testSheet = workbook.addWorksheet("Test Suggestions");

  testSheet.columns = [
    { header: "Test Case", key: "testCase", width: 40 },
    { header: "Steps", key: "steps", width: 80 },
    { header: "Expected Result", key: "expectedResult", width: 60 },
    { header: "Priority", key: "priority", width: 15 }
  ];

  testSheet.addRows([
    {
      testCase: "Page Load Test",
      steps: `Open ${knowledge.websiteUrl}`,
      expectedResult: "Page should load successfully without errors",
      priority: "High"
    },
    {
      testCase: "UI Element Visibility Test",
      steps: "Verify detected buttons, links, and inputs are visible",
      expectedResult: "Important UI elements should be visible",
      priority: "High"
    },
    {
      testCase: "Navigation Link Test",
      steps: "Click each detected link and verify navigation",
      expectedResult: "Links should navigate correctly",
      priority: "Medium"
    },
    {
      testCase: "Input Field Test",
      steps: "Enter sample values into input fields",
      expectedResult: "Input fields should accept valid data",
      priority: "Medium"
    }
  ]);

  const riskSheet = workbook.addWorksheet("Issues and Risks");

  riskSheet.columns = [
    { header: "Issue / Risk", key: "issue", width: 50 },
    { header: "Severity", key: "severity", width: 20 },
    { header: "Recommendation", key: "recommendation", width: 80 }
  ];

  const risks = [];

  if (knowledge.totalElements === 0) {
    risks.push({
      issue: "No UI elements detected",
      severity: "High",
      recommendation: "Check whether the page is protected, dynamically loaded, or blocked"
    });
  }

  if (inputs.length > 0 && buttons.length === 0) {
    risks.push({
      issue: "Inputs found but no buttons detected",
      severity: "Medium",
      recommendation: "Verify if form submission buttons are custom components"
    });
  }

  if (links.length === 0) {
    risks.push({
      issue: "No navigation links detected",
      severity: "Low",
      recommendation: "Check if navigation is JavaScript-based or hidden behind menus"
    });
  }

  if (risks.length === 0) {
    risks.push({
      issue: "No major risks detected in basic inspection",
      severity: "Low",
      recommendation: "Proceed with deeper testing and AI-based planning"
    });
  }

  riskSheet.addRows(risks);

  workbook.eachSheet((sheet) => {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: "top", wrapText: true };
      });
    });
  });

  await workbook.xlsx.writeFile(excelPath);

  return {
    reportId,
    excelPath
  };
}