import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

export async function generateInspectionReport(knowledge) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const reportPath = `reports/inspection-report-${reportId}.md`;

  const buttons = knowledge.elements.filter((el) => el.tag === "button");
  const links = knowledge.elements.filter((el) => el.tag === "a");
  const inputs = knowledge.elements.filter(
    (el) => el.tag === "input" || el.tag === "textarea" || el.tag === "select"
  );

  const content = `
# ASEA Website Inspection Report

## Website Details

| Field | Value |
|---|---|
| Website URL | ${knowledge.websiteUrl} |
| Current URL | ${knowledge.currentUrl} |
| Page Title | ${knowledge.pageTitle} |
| Inspected At | ${knowledge.inspectedAt} |
| Screenshot | ${knowledge.screenshotPath} |
| Total UI Elements | ${knowledge.totalElements} |

## UI Summary

| Element Type | Count |
|---|---:|
| Buttons | ${buttons.length} |
| Links | ${links.length} |
| Inputs / Textareas / Selects | ${inputs.length} |

## Raw Extracted Elements

\`\`\`json
${JSON.stringify(knowledge.elements, null, 2)}
\`\`\`
`;

  await fs.writeFile(reportPath, content);

  return {
    reportId,
    reportPath
  };
}