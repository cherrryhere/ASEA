import fs from "fs-extra";
import { inspectWebsite } from "./browserAgent.js";
import { discoverFeaturesWithAI } from "./aiFeatureDiscoveryAgent.js";
import { generateFeatureReports } from "./featureReportAgent.js";
import { generateTestCasesFromFeatures } from "./testGeneratorAgent.js";
import { generateTestCaseReports } from "./testCaseReportAgent.js";
import { generatePlaywrightScripts } from "./playwrightTestGeneratorAgent.js";
import { executeGeneratedTests } from "./testExecutorAgent.js";
import { generateTestExecutionReports } from "./testExecutionReportAgent.js";
import { analyzeTestFailures } from "./failureAnalysisAgent.js";
import { generateFailureAnalysisReports } from "./failureAnalysisReportAgent.js";

export async function runAutonomousQAPipeline(websiteUrl) {
  await fs.ensureDir("tests/generated");
  await fs.ensureDir("test-results");
  await fs.ensureDir("reports");

  await fs.emptyDir("tests/generated");
  await fs.emptyDir("test-results");

  const startedAt = new Date().toISOString();

  const knowledge = await inspectWebsite(websiteUrl);

  const featureDiscovery = await discoverFeaturesWithAI(knowledge);

  const featureReports = await generateFeatureReports(featureDiscovery);

  const testCases = await generateTestCasesFromFeatures(featureDiscovery);

  const testCaseReports = await generateTestCaseReports(testCases);

  const playwrightScripts = await generatePlaywrightScripts({
    websiteUrl,
    testCaseData: testCases
  });

  const executionData = await executeGeneratedTests();

  const executionReports = await generateTestExecutionReports(executionData);

  const failureAnalysis = await analyzeTestFailures(executionData);

  const failureAnalysisReports =
    await generateFailureAnalysisReports(failureAnalysis);

  const completedAt = new Date().toISOString();

  return {
    websiteUrl,
    startedAt,
    completedAt,
    pipelineSummary: {
      pageTitle: knowledge.pageTitle,
      totalElements: knowledge.totalElements,
      totalFeatures: featureDiscovery.totalFeatures,
      totalTestCases: testCases.totalTestCases,
      generatedPlaywrightFiles: playwrightScripts.totalFiles,
      totalExecutedTests: executionData.summary.total,
      passed: executionData.summary.passed,
      failed: executionData.summary.failed,
      skipped: executionData.summary.skipped,
      passRate: executionData.summary.passRate,
      failedTestsAnalyzed: failureAnalysis.totalFailedTests
    },
    knowledge,
    featureDiscovery,
    testCases,
    playwrightScripts,
    executionData,
    failureAnalysis,
    reports: {
      featureReports,
      testCaseReports,
      executionReports,
      failureAnalysisReports
    }
  };
}