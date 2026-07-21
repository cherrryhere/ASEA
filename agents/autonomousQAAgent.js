import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

import {
  inspectWebsite
} from "./browserAgent.js";

import {
  discoverFeaturesWithAI
} from "./aiFeatureDiscoveryAgent.js";

import {
  generateFeatureReports
} from "./featureReportAgent.js";

import {
  generateTestCasesFromFeatures
} from "./testGeneratorAgent.js";

import {
  generateTestCaseReports
} from "./testCaseReportAgent.js";

import {
  generatePlaywrightScripts
} from "./playwrightTestGeneratorAgent.js";

import {
  executeGeneratedTests
} from "./testExecutorAgent.js";

import {
  generateTestExecutionReports
} from "./testExecutionReportAgent.js";

import {
  analyzeTestFailures
} from "./failureAnalysisAgent.js";

import {
  generateFailureAnalysisReports
} from "./failureAnalysisReportAgent.js";

import {
  saveQARunHistory
} from "./qaRunHistoryAgent.js";

function calculateDurationSeconds(
  startedAt,
  completedAt
) {
  const startTime =
    new Date(startedAt).getTime();

  const completedTime =
    new Date(completedAt).getTime();

  if (
    Number.isNaN(startTime) ||
    Number.isNaN(completedTime)
  ) {
    return 0;
  }

  return Number(
    (
      (completedTime - startTime) /
      1000
    ).toFixed(2)
  );
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeProjectContext(
  projectContext
) {
  if (
    !projectContext ||
    typeof projectContext !== "object"
  ) {
    return {
      projectId: null,
      projectName: null
    };
  }

  return {
    projectId:
      cleanText(
        projectContext.projectId
      ) || null,

    projectName:
      cleanText(
        projectContext.projectName
      ) || null
  };
}

export async function runAutonomousQAPipeline(
  websiteUrl,
  projectContext = {}
) {
  const cleanWebsiteUrl =
    cleanText(websiteUrl);

  if (!cleanWebsiteUrl) {
    throw new Error(
      "websiteUrl is required."
    );
  }

  const normalizedProject =
    normalizeProjectContext(
      projectContext
    );

  await fs.ensureDir(
    "tests/generated"
  );

  await fs.ensureDir(
    "test-results"
  );

  await fs.ensureDir("reports");
  await fs.ensureDir("storage");

  await fs.emptyDir(
    "tests/generated"
  );

  await fs.emptyDir(
    "test-results"
  );

  const runId = uuidv4();

  const startedAt =
    new Date().toISOString();

  try {
    const knowledge =
      await inspectWebsite(
        cleanWebsiteUrl
      );

    const featureDiscovery =
      await discoverFeaturesWithAI(
        knowledge
      );

    const featureReports =
      await generateFeatureReports(
        featureDiscovery
      );

    const testCases =
      await generateTestCasesFromFeatures(
        featureDiscovery
      );

    const testCaseReports =
      await generateTestCaseReports(
        testCases
      );

    const playwrightScripts =
      await generatePlaywrightScripts({
        websiteUrl: cleanWebsiteUrl,
        testCaseData: testCases
      });

    const executionData =
      await executeGeneratedTests();

    const executionReports =
      await generateTestExecutionReports(
        executionData
      );

    const failureAnalysis =
      await analyzeTestFailures(
        executionData
      );

    const failureAnalysisReports =
      await generateFailureAnalysisReports(
        failureAnalysis
      );

    const completedAt =
      new Date().toISOString();

    const durationSeconds =
      calculateDurationSeconds(
        startedAt,
        completedAt
      );

    const pipelineSummary = {
      pageTitle:
        knowledge?.pageTitle || "",

      totalElements:
        Number(
          knowledge?.totalElements || 0
        ),

      totalFeatures:
        Number(
          featureDiscovery
            ?.totalFeatures ||
          featureDiscovery
            ?.features?.length ||
          0
        ),

      totalTestCases:
        Number(
          testCases?.totalTestCases ||
          testCases?.testCases?.length ||
          0
        ),

      generatedPlaywrightFiles:
        Number(
          playwrightScripts
            ?.totalFiles || 0
        ),

      totalExecutedTests:
        Number(
          executionData
            ?.summary?.total || 0
        ),

      passed:
        Number(
          executionData
            ?.summary?.passed || 0
        ),

      failed:
        Number(
          executionData
            ?.summary?.failed || 0
        ),

      skipped:
        Number(
          executionData
            ?.summary?.skipped || 0
        ),

      passRate:
        Number(
          executionData
            ?.summary?.passRate || 0
        ),

      failedTestsAnalyzed:
        Number(
          failureAnalysis
            ?.totalFailedTests || 0
        )
    };

    const reports = {
      featureReports,
      testCaseReports,
      executionReports,
      failureAnalysisReports
    };

    const historyRecord =
      await saveQARunHistory({
        runId,

        projectId:
          normalizedProject.projectId,

        projectName:
          normalizedProject.projectName,

        websiteUrl:
          cleanWebsiteUrl,

        status: "completed",
        startedAt,
        completedAt,
        durationSeconds,
        pipelineSummary,
        reports,
        error: null
      });

    return {
      runId,

      projectId:
        normalizedProject.projectId,

      projectName:
        normalizedProject.projectName,

      websiteUrl:
        cleanWebsiteUrl,

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
    const completedAt =
      new Date().toISOString();

    const durationSeconds =
      calculateDurationSeconds(
        startedAt,
        completedAt
      );

    await saveQARunHistory({
      runId,

      projectId:
        normalizedProject.projectId,

      projectName:
        normalizedProject.projectName,

      websiteUrl:
        cleanWebsiteUrl,

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