import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generateAIPlanReports({ command, websiteUrl, knowledge, plan }) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();

  const markdownPath = `reports/ai-plan-report-${reportId}.md`;
  const excelPath = `reports/ai-plan-report-${reportId}.xlsx`;

  await generateMarkdownPlanReport({
    markdownPath,
    command,
    websiteUrl,
    knowledge,
    plan
  });

  await generateExcelPlanReport({
    excelPath,
    command,
    websiteUrl,
    knowledge,
    plan
  });

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateMarkdownPlanReport({ markdownPath, command, websiteUrl, knowledge, plan }) {
  const executionSteps = Array.isArray(plan.executionSteps)
    ? plan.executionSteps
    : [];

  const testCases = Array.isArray(plan.testCases)
    ? plan.testCases
    : [];

  const risks = Array.isArray(plan.risks)
    ? plan.risks
    : [];

  const recommendations = Array.isArray(plan.recommendations)
    ? plan.recommendations
    : [];

  const detectedFunctionality = Array.isArray(plan.detectedFunctionality)
    ? plan.detectedFunctionality
    : [];

  const content = `
# ASEA AI Engineering Plan Report

## Request Details

| Field | Value |
|---|---|
| User Command | ${command} |
| Website URL | ${websiteUrl} |
| Page Title | ${knowledge.pageTitle || "N/A"} |
| Current URL | ${knowledge.currentUrl || "N/A"} |
| Total UI Elements | ${knowledge.totalElements || 0} |
| Generated At | ${new Date().toISOString()} |

---

## Goal

${plan.goal || "N/A"}

---

## Summary

${plan.summary || "N/A"}

---

## Detected Functionality

${
  detectedFunctionality.length === 0
    ? "No detected functionality provided."
    : detectedFunctionality.map((item, index) => `${index + 1}. ${item}`).join("\n")
}

---

## Execution Steps

${
  executionSteps.length === 0
    ? "No execution steps provided."
    : executionSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")
}

---

## Test Cases

${
  testCases.length === 0
    ? "No test cases generated."
    : testCases
        .map(
          (testCase, index) => `
### Test Case ${index + 1}: ${testCase.title || "Untitled Test Case"}

- Priority: ${testCase.priority || "N/A"}
- Expected Result: ${testCase.expectedResult || "N/A"}

#### Steps
${
  Array.isArray(testCase.steps)
    ? testCase.steps.map((step, stepIndex) => `${stepIndex + 1}. ${step}`).join("\n")
    : "No steps provided."
}
`
        )
        .join("\n")
}

---

## Risks

${
  risks.length === 0
    ? "No risks provided."
    : risks.map((risk, index) => `${index + 1}. ${risk}`).join("\n")
}

---

## Recommendations

${
  recommendations.length === 0
    ? "No recommendations provided."
    : recommendations.map((recommendation, index) => `${index + 1}. ${recommendation}`).join("\n")
}

---

## Raw AI Plan

\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

---

## Raw Website Knowledge Summary

\`\`\`json
${JSON.stringify(
  {
    websiteUrl: knowledge.websiteUrl,
    currentUrl: knowledge.currentUrl,
    pageTitle: knowledge.pageTitle,
    totalElements: knowledge.totalElements,
    screenshotPath: knowledge.screenshotPath
  },
  null,
  2
)}
\`\`\`
`;

  await fs.writeFile(markdownPath, content);
}

async function generateExcelPlanReport({ excelPath, command, websiteUrl, knowledge, plan }) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const executionSteps = Array.isArray(plan.executionSteps)
    ? plan.executionSteps
    : [];

  const testCases = Array.isArray(plan.testCases)
    ? plan.testCases
    : [];

  const risks = Array.isArray(plan.risks)
    ? plan.risks
    : [];

  const recommendations = Array.isArray(plan.recommendations)
    ? plan.recommendations
    : [];

  const detectedFunctionality = Array.isArray(plan.detectedFunctionality)
    ? plan.detectedFunctionality
    : [];

  const summarySheet = workbook.addWorksheet("Plan Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 30 },
    { header: "Value", key: "value", width: 100 }
  ];

  summarySheet.addRows([
    { field: "User Command", value: command },
    { field: "Website URL", value: websiteUrl },
    { field: "Current URL", value: knowledge.currentUrl || "N/A" },
    { field: "Page Title", value: knowledge.pageTitle || "N/A" },
    { field: "Total UI Elements", value: knowledge.totalElements || 0 },
    { field: "Screenshot Path", value: knowledge.screenshotPath || "N/A" },
    { field: "AI Goal", value: plan.goal || "N/A" },
    { field: "AI Summary", value: plan.summary || "N/A" },
    { field: "Generated At", value: new Date().toISOString() }
  ]);

  const functionalitySheet = workbook.addWorksheet("Detected Functionality");

  functionalitySheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Functionality", key: "functionality", width: 100 }
  ];

  if (detectedFunctionality.length > 0) {
    functionalitySheet.addRows(
      detectedFunctionality.map((item, index) => ({
        no: index + 1,
        functionality: item
      }))
    );
  } else {
    functionalitySheet.addRow({
      no: 1,
      functionality: "No detected functionality provided."
    });
  }

  const stepsSheet = workbook.addWorksheet("Execution Steps");

  stepsSheet.columns = [
    { header: "Step No", key: "stepNo", width: 15 },
    { header: "Step", key: "step", width: 120 }
  ];

  if (executionSteps.length > 0) {
    stepsSheet.addRows(
      executionSteps.map((step, index) => ({
        stepNo: index + 1,
        step
      }))
    );
  } else {
    stepsSheet.addRow({
      stepNo: 1,
      step: "No execution steps provided."
    });
  }

  const testCasesSheet = workbook.addWorksheet("Test Cases");

  testCasesSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Title", key: "title", width: 50 },
    { header: "Priority", key: "priority", width: 20 },
    { header: "Steps", key: "steps", width: 100 },
    { header: "Expected Result", key: "expectedResult", width: 80 }
  ];

  if (testCases.length > 0) {
    testCasesSheet.addRows(
      testCases.map((testCase, index) => ({
        no: index + 1,
        title: testCase.title || "Untitled Test Case",
        priority: testCase.priority || "N/A",
        steps: Array.isArray(testCase.steps)
          ? testCase.steps.join("\n")
          : "No steps provided.",
        expectedResult: testCase.expectedResult || "N/A"
      }))
    );
  } else {
    testCasesSheet.addRow({
      no: 1,
      title: "No test cases generated",
      priority: "N/A",
      steps: "N/A",
      expectedResult: "N/A"
    });
  }

  const risksSheet = workbook.addWorksheet("Risks");

  risksSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Risk", key: "risk", width: 120 }
  ];

  if (risks.length > 0) {
    risksSheet.addRows(
      risks.map((risk, index) => ({
        no: index + 1,
        risk
      }))
    );
  } else {
    risksSheet.addRow({
      no: 1,
      risk: "No risks provided."
    });
  }

  const recommendationsSheet = workbook.addWorksheet("Recommendations");

  recommendationsSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Recommendation", key: "recommendation", width: 120 }
  ];

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
      recommendation: "No recommendations provided."
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