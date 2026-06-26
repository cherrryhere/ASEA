import fs from "fs-extra";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

export async function generateFeatureReports(featureDiscovery) {
  await fs.ensureDir("reports");

  const reportId = uuidv4();
  const markdownPath = `reports/feature-discovery-report-${reportId}.md`;
  const excelPath = `reports/feature-discovery-report-${reportId}.xlsx`;

  await generateFeatureMarkdownReport(markdownPath, featureDiscovery);
  await generateFeatureExcelReport(excelPath, featureDiscovery);

  return {
    reportId,
    markdownPath,
    excelPath
  };
}

async function generateFeatureMarkdownReport(markdownPath, featureDiscovery) {
  const content = `
# ASEA Feature Discovery Report

## Website Summary

| Field | Value |
|---|---|
| Website URL | ${featureDiscovery.websiteUrl} |
| Current URL | ${featureDiscovery.currentUrl} |
| Page Title | ${featureDiscovery.pageTitle} |
| Total UI Elements | ${featureDiscovery.totalElements} |
| Total Features Discovered | ${featureDiscovery.totalFeatures} |
| Discovered At | ${featureDiscovery.discoveredAt} |

---

## Features Discovered

${featureDiscovery.features
  .map(
    (feature, index) => `
### ${index + 1}. ${feature.featureName}

| Field | Value |
|---|---|
| Feature Type | ${feature.featureType} |
| Priority | ${feature.priority} |
| Description | ${feature.description} |
| Total Elements | ${feature.elements.length} |

#### Possible Tests

${feature.possibleTests.map((test, testIndex) => `${testIndex + 1}. ${test}`).join("\n")}

#### Related Elements

\`\`\`json
${JSON.stringify(feature.elements, null, 2)}
\`\`\`
`
  )
  .join("\n")}
`;

  await fs.writeFile(markdownPath, content);
}

async function generateFeatureExcelReport(excelPath, featureDiscovery) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ASEA";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.columns = [
    { header: "Field", key: "field", width: 35 },
    { header: "Value", key: "value", width: 100 }
  ];

  summarySheet.addRows([
    { field: "Website URL", value: featureDiscovery.websiteUrl },
    { field: "Current URL", value: featureDiscovery.currentUrl },
    { field: "Page Title", value: featureDiscovery.pageTitle },
    { field: "Total UI Elements", value: featureDiscovery.totalElements },
    { field: "Total Features Discovered", value: featureDiscovery.totalFeatures },
    { field: "Discovered At", value: featureDiscovery.discoveredAt }
  ]);

  const featuresSheet = workbook.addWorksheet("Features");

  featuresSheet.columns = [
    { header: "No", key: "no", width: 10 },
    { header: "Feature Name", key: "featureName", width: 40 },
    { header: "Feature Type", key: "featureType", width: 25 },
    { header: "Priority", key: "priority", width: 20 },
    { header: "Description", key: "description", width: 100 },
    { header: "Element Count", key: "elementCount", width: 20 }
  ];

  featuresSheet.addRows(
    featureDiscovery.features.map((feature, index) => ({
      no: index + 1,
      featureName: feature.featureName,
      featureType: feature.featureType,
      priority: feature.priority,
      description: feature.description,
      elementCount: feature.elements.length
    }))
  );

  const testsSheet = workbook.addWorksheet("Possible Tests");

  testsSheet.columns = [
    { header: "Feature Name", key: "featureName", width: 40 },
    { header: "Test No", key: "testNo", width: 15 },
    { header: "Possible Test", key: "possibleTest", width: 100 }
  ];

  const testRows = [];

  featureDiscovery.features.forEach((feature) => {
    feature.possibleTests.forEach((possibleTest, index) => {
      testRows.push({
        featureName: feature.featureName,
        testNo: index + 1,
        possibleTest
      });
    });
  });

  testsSheet.addRows(testRows);

  const elementsSheet = workbook.addWorksheet("Feature Elements");

  elementsSheet.columns = [
    { header: "Feature Name", key: "featureName", width: 40 },
    { header: "Tag", key: "tag", width: 15 },
    { header: "Text", key: "text", width: 50 },
    { header: "Placeholder", key: "placeholder", width: 35 },
    { header: "Type", key: "type", width: 20 },
    { header: "Name", key: "name", width: 25 },
    { header: "ID", key: "id", width: 25 },
    { header: "Class", key: "className", width: 50 },
    { header: "ARIA Label", key: "ariaLabel", width: 35 },
    { header: "Href", key: "href", width: 70 }
  ];

  const elementRows = [];

  featureDiscovery.features.forEach((feature) => {
    feature.elements.forEach((element) => {
      elementRows.push({
        featureName: feature.featureName,
        tag: element.tag || "",
        text: element.text || "",
        placeholder: element.placeholder || "",
        type: element.type || "",
        name: element.name || "",
        id: element.id || "",
        className: element.className || "",
        ariaLabel: element.ariaLabel || "",
        href: element.href || ""
      });
    });
  });

  elementsSheet.addRows(elementRows);

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