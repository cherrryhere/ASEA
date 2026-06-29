import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
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
import { saveQARunHistory } from "./qaRunHistoryAgent.js";

function calculateDurationSeconds(startedAt, completedAt) {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Number(((end - start) / 1000).toFixed(2));
}

export async function runAutonomousQAPipeline(websiteUrl) {
  await fs.ensureDir("tests/generated");
  await fs.ensureDir("test-results");
  await fs.ensureDir("reports");
  await fs.ensureDir("storage");

  await fs.emptyDir("tests/generated");
  await fs.emptyDir("test-results");

  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  try {
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
    const durationSeconds = calculateDurationSeconds(startedAt, completedAt);

    const pipelineSummary = {
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
    };

    const reports = {
      featureReports,
      testCaseReports,
      executionReports,
      failureAnalysisReports
    };

    const historyRecord = await saveQARunHistory({
      runId,
      websiteUrl,
      status: "completed",
      startedAt,
      completedAt,
      durationSeconds,
      pipelineSummary,
      reports
    });

    return {
      runId,
      websiteUrl,
      status: "completed",
      startedAt,
      completedAt,
      durationSeconds,
      pipelineSummary,
      knowledge,
      featureDiscovery,
      testCases,
      playwrightScripts,
      executionData,
      failureAnalysis,
      reports,
      historyRecord
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    const durationSeconds = calculateDurationSeconds(startedAt, completedAt);

    await saveQARunHistory({
      runId,
      websiteUrl,
      status: "failed",
      startedAt,
      completedAt,
      durationSeconds,
      pipelineSummary: {},
      reports: {},
      error: {
        message: error.message,
        stack: error.stack
      }
    });

    throw error;
  }
}