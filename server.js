import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { inspectWebsite } from "./agents/browserAgent.js";
import { generateInspectionReport } from "./agents/reportAgent.js";
import { generateExcelReport } from "./agents/excelReportAgent.js";
import { generateEngineeringPlan } from "./agents/plannerAgent.js";
import { generateAIPlanReports } from "./agents/aiPlanReportAgent.js";
import { discoverFeatures } from "./agents/featureDiscoveryAgent.js";
import { generateFeatureReports } from "./agents/featureReportAgent.js";
import { discoverFeaturesWithAI } from "./agents/aiFeatureDiscoveryAgent.js";
import { generateTestCasesFromFeatures } from "./agents/testGeneratorAgent.js";
import { generateTestCaseReports } from "./agents/testCaseReportAgent.js";
import { generatePlaywrightScripts } from "./agents/playwrightTestGeneratorAgent.js";
import { executeGeneratedTests } from "./agents/testExecutorAgent.js";
import { generateTestExecutionReports } from "./agents/testExecutionReportAgent.js";
import { runAutonomousQAPipeline } from "./agents/autonomousQAAgent.js";
import { analyzeTestFailures } from "./agents/failureAnalysisAgent.js";
import { generateFailureAnalysisReports } from "./agents/failureAnalysisReportAgent.js";
import { repairGeneratedTests } from "./agents/testRepairAgent.js";
import { generateTestRepairReports } from "./agents/testRepairReportAgent.js";
import { validateRepairResults } from "./agents/repairValidationAgent.js";
import { generateRepairValidationReports } from "./agents/repairValidationReportAgent.js";

import {
  getQARunHistory,
  getLatestQARun,
  getProjectQARuns,
  getLatestProjectQARun,
  deleteProjectQARuns,
  clearQARunHistory
} from "./agents/qaRunHistoryAgent.js";

import { generateQARunAnalytics } from "./agents/qaAnalyticsAgent.js";
import { generateQAAnalyticsReports } from "./agents/qaAnalyticsReportAgent.js";

import {
  createQAProject,
  getQAProjects,
  getQAProjectById,
  updateQAProject,
  updateQAProjectRunStats,
  validateProjectCanRun,
  deleteQAProject,
  getAllowedProjectStatuses
} from "./agents/qaProjectAgent.js";

import { generateProjectRunAnalytics } from "./agents/projectRunAnalyticsAgent.js";

import {
  generateProjectRunAnalyticsReports
} from "./agents/projectRunAnalyticsReportAgent.js";

import { generateQAExecutiveSummary } from "./agents/qaExecutiveSummaryAgent.js";
import { generateQAExecutiveSummaryReports } from "./agents/qaExecutiveSummaryReportAgent.js";

import {
  getAPICatalog,
  generatePlatformReadiness
} from "./agents/platformReadinessAgent.js";

import { generatePlatformReadinessReports } from "./agents/platformReadinessReportAgent.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "ASEA Agent Backend is running",
    version: "3.0.0",
    aiProvider: "GroqCloud",
    model:
      process.env.GROQ_MODEL ||
      "openai/gpt-oss-120b",
    stage:
      "SaaS-Ready Backend Stabilization"
  });
});

app.get("/health", (req, res) => {
  return res.json({
    success: true,
    status: "healthy",
    version: "3.0.0",
    timestamp: new Date().toISOString()
  });
});

app.get("/api-catalog", (req, res) => {
  return res.json({
    success: true,
    message: "API catalog fetched successfully",
    data: getAPICatalog()
  });
});

app.get("/platform-readiness", async (req, res) => {
  try {
    const readiness =
      await generatePlatformReadiness();

    return res.json({
      success: true,
      message:
        "Platform readiness generated successfully",
      data: readiness
    });
  } catch (error) {
    console.error(
      "Platform Readiness API Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate platform readiness",
      error: error.message
    });
  }
});

app.get(
  "/platform-readiness/report",
  async (req, res) => {
    try {
      const readiness =
        await generatePlatformReadiness();

      const reports =
        await generatePlatformReadinessReports(
          readiness
        );

      return res.json({
        success: true,
        message:
          "Platform readiness reports generated successfully",
        data: {
          readiness,
          reports
        }
      });
    } catch (error) {
      console.error(
        "Platform Readiness Report API Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate platform readiness reports",
        error: error.message
      });
    }
  }
);

app.post("/inspect", async (req, res) => {
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        message: "websiteUrl is required"
      });
    }

    const knowledge =
      await inspectWebsite(websiteUrl);

    const markdownReport =
      await generateInspectionReport(knowledge);

    const excelReport =
      await generateExcelReport(knowledge);

    return res.json({
      success: true,
      message:
        "Website inspected and reports generated successfully",
      data: {
        knowledge,
        reports: {
          markdown: markdownReport,
          excel: excelReport
        }
      }
    });
  } catch (error) {
    console.error("Inspect API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Website inspection failed",
      error: error.message
    });
  }
});

app.post("/plan", async (req, res) => {
  try {
    const {
      command,
      websiteUrl
    } = req.body;

    if (!command || !websiteUrl) {
      return res.status(400).json({
        success: false,
        message:
          "command and websiteUrl are required"
      });
    }

    const knowledge =
      await inspectWebsite(websiteUrl);

    const plan =
      await generateEngineeringPlan(
        command,
        knowledge
      );

    const reports =
      await generateAIPlanReports({
        command,
        websiteUrl,
        knowledge,
        plan
      });

    return res.json({
      success: true,
      message:
        "AI engineering plan generated successfully",
      data: {
        command,
        websiteUrl,
        knowledge,
        plan,
        reports
      }
    });
  } catch (error) {
    console.error("Planner API Error:", error);

    return res.status(500).json({
      success: false,
      message:
        "AI engineering plan generation failed",
      error: error.message
    });
  }
});

app.post("/discover-features", async (req, res) => {
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        message: "websiteUrl is required"
      });
    }

    const knowledge =
      await inspectWebsite(websiteUrl);

    const featureDiscovery =
      discoverFeatures(knowledge);

    const reports =
      await generateFeatureReports(
        featureDiscovery
      );

    return res.json({
      success: true,
      message:
        "Features discovered successfully",
      data: {
        websiteUrl,
        knowledge,
        featureDiscovery,
        reports
      }
    });
  } catch (error) {
    console.error(
      "Feature Discovery API Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Feature discovery failed",
      error: error.message
    });
  }
});

app.post(
  "/ai-discover-features",
  async (req, res) => {
    try {
      const { websiteUrl } = req.body;

      if (!websiteUrl) {
        return res.status(400).json({
          success: false,
          message: "websiteUrl is required"
        });
      }

      const knowledge =
        await inspectWebsite(websiteUrl);

      const featureDiscovery =
        await discoverFeaturesWithAI(
          knowledge
        );

      const reports =
        await generateFeatureReports(
          featureDiscovery
        );

      return res.json({
        success: true,
        message:
          "AI features discovered successfully",
        data: {
          websiteUrl,
          knowledge,
          featureDiscovery,
          reports
        }
      });
    } catch (error) {
      console.error(
        "AI Feature Discovery API Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "AI feature discovery failed",
        error: error.message
      });
    }
  }
);

app.post(
  "/generate-test-cases",
  async (req, res) => {
    try {
      const { websiteUrl } = req.body;

      if (!websiteUrl) {
        return res.status(400).json({
          success: false,
          message: "websiteUrl is required"
        });
      }

      const knowledge =
        await inspectWebsite(websiteUrl);

      const featureDiscovery =
        await discoverFeaturesWithAI(
          knowledge
        );

      const testCases =
        await generateTestCasesFromFeatures(
          featureDiscovery
        );

      const reports =
        await generateTestCaseReports(
          testCases
        );

      return res.json({
        success: true,
        message:
          "Test cases generated successfully",
        data: {
          websiteUrl,
          knowledge,
          featureDiscovery,
          testCases,
          reports
        }
      });
    } catch (error) {
      console.error(
        "Test Case Generation API Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Test case generation failed",
        error: error.message
      });
    }
  }
);

app.post(
  "/generate-playwright-tests",
  async (req, res) => {
    try {
      const { websiteUrl } = req.body;

      if (!websiteUrl) {
        return res.status(400).json({
          success: false,
          message: "websiteUrl is required"
        });
      }

      const knowledge =
        await inspectWebsite(websiteUrl);

      const featureDiscovery =
        await discoverFeaturesWithAI(
          knowledge
        );

      const testCases =
        await generateTestCasesFromFeatures(
          featureDiscovery
        );

      const playwrightScripts =
        await generatePlaywrightScripts({
          websiteUrl,
          testCaseData: testCases
        });

      return res.json({
        success: true,
        message:
          "Playwright tests generated successfully",
        data: {
          websiteUrl,
          knowledge,
          featureDiscovery,
          testCases,
          playwrightScripts
        }
      });
    } catch (error) {
      console.error(
        "Playwright Generation API Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Playwright test generation failed",
        error: error.message
      });
    }
  }
);

app.post(
  "/execute-generated-tests",
  async (req, res) => {
    try {
      const executionData =
        await executeGeneratedTests();

      const reports =
        await generateTestExecutionReports(
          executionData
        );

      return res.json({
        success: true,
        message:
          "Generated tests executed successfully",
        data: {
          executionData,
          reports
        }
      });
    } catch (error) {
      console.error(
        "Test Execution API Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Test execution failed",
        error: error.message
      });
    }
  }
);

app.post(
  "/run-autonomous-qa",
  async (req, res) => {
    try {
      const { websiteUrl } = req.body;

      if (!websiteUrl) {
        return res.status(400).json({
          success: false,
          message: "websiteUrl is required"
        });
      }

      const result =
        await runAutonomousQAPipeline(
          websiteUrl
        );

      return res.json({
        success: true,
        message:
          "Autonomous QA pipeline completed successfully",
        data: result
      });
    } catch (error) {
      console.error(
        "Autonomous QA API Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Autonomous QA pipeline failed",
        error: error.message
      });
    }
  }
);

app.post(
  "/analyze-test-failures",
  async (req, res) => {
    try {
      const executionData =
        await executeGeneratedTests();

      const failureAnalysis =
        await analyzeTestFailures(
          executionData
        );

      const reports =
        await generateFailureAnalysisReports(
          failureAnalysis
        );

      return res.json({
        success: true,
        message:
          "Test failures analyzed successfully",
        data: {
          executionData,
          failureAnalysis,
          reports
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failure analysis failed",
        error: error.message
      });
    }
  }
);

app.post(
  "/repair-generated-tests",
  async (req, res) => {
    try {
      const executionData =
        await executeGeneratedTests();

      const failureAnalysis =
        await analyzeTestFailures(
          executionData
        );

      const repairData =
        await repairGeneratedTests({
          executionData,
          failureAnalysis
        });

      const reports =
        await generateTestRepairReports(
          repairData
        );

      return res.json({
        success: true,
        message:
          "Generated tests repaired successfully",
        data: {
          executionData,
          failureAnalysis,
          repairData,
          reports
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Test repair failed",
        error: error.message
      });
    }
  }
);

app.post(
  "/validate-repair",
  async (req, res) => {
    try {
      const validationData =
        await validateRepairResults();

      const reports =
        await generateRepairValidationReports(
          validationData
        );

      return res.json({
        success: true,
        message:
          "Repair validation completed successfully",
        data: {
          validationData,
          reports
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Repair validation failed",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-run-history",
  async (req, res) => {
    try {
      const {
        projectId,
        status,
        limit
      } = req.query;

      const history =
        await getQARunHistory({
          projectId,
          status,
          limit
        });

      return res.json({
        success: true,
        message:
          "QA run history fetched successfully",
        data: history
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch QA run history",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-run-history/latest",
  async (req, res) => {
    try {
      const { projectId } = req.query;

      const latestRun =
        await getLatestQARun({
          projectId
        });

      return res.json({
        success: true,
        message:
          "Latest QA run fetched successfully",
        data: latestRun
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch latest QA run",
        error: error.message
      });
    }
  }
);

app.delete(
  "/qa-run-history",
  async (req, res) => {
    try {
      const result =
        await clearQARunHistory();

      return res.json({
        success: true,
        message:
          "QA run history cleared successfully",
        data: result
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to clear QA run history",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-run-analytics",
  async (req, res) => {
    try {
      const analytics =
        await generateQARunAnalytics();

      return res.json({
        success: true,
        message:
          "QA analytics generated successfully",
        data: analytics
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to generate QA analytics",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-run-analytics/report",
  async (req, res) => {
    try {
      const analytics =
        await generateQARunAnalytics();

      const reports =
        await generateQAAnalyticsReports(
          analytics
        );

      return res.json({
        success: true,
        message:
          "QA analytics reports generated successfully",
        data: {
          analytics,
          reports
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to generate analytics reports",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-project-statuses",
  (req, res) => {
    return res.json({
      success: true,
      message:
        "QA project statuses fetched successfully",
      data: {
        statuses:
          getAllowedProjectStatuses()
      }
    });
  }
);

app.post(
  "/qa-projects",
  async (req, res) => {
    try {
      const {
        name,
        websiteUrl,
        description
      } = req.body;

      const project =
        await createQAProject({
          name,
          websiteUrl,
          description
        });

      return res.status(201).json({
        success: true,
        message:
          "QA project created successfully",
        data: {
          project
        }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          "Failed to create QA project",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-projects",
  async (req, res) => {
    try {
      const {
        status,
        search
      } = req.query;

      const projects =
        await getQAProjects({
          status,
          search
        });

      return res.json({
        success: true,
        message:
          "QA projects fetched successfully",
        data: projects
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          "Failed to fetch QA projects",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-projects/:projectId/runs/latest",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      await getQAProjectById(projectId);

      const latestRun =
        await getLatestProjectQARun(
          projectId
        );

      return res.json({
        success: true,
        message:
          "Latest project QA run fetched successfully",
        data: latestRun
      });
    } catch (error) {
      const statusCode =
        error.message ===
        "QA project not found."
          ? 404
          : 500;

      return res.status(statusCode).json({
        success: false,
        message:
          "Failed to fetch latest project run",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-projects/:projectId/runs",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const project =
        await getQAProjectById(projectId);

      const history =
        await getProjectQARuns(projectId);

      return res.json({
        success: true,
        message:
          "Project QA runs fetched successfully",
        data: {
          project,
          ...history
        }
      });
    } catch (error) {
      const statusCode =
        error.message ===
        "QA project not found."
          ? 404
          : 500;

      return res.status(statusCode).json({
        success: false,
        message:
          "Failed to fetch project QA runs",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-projects/:projectId/analytics/report",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const project =
        await getQAProjectById(projectId);

      const analytics =
        await generateProjectRunAnalytics(
          projectId
        );

      const reports =
        await generateProjectRunAnalyticsReports({
          project,
          analytics
        });

      return res.json({
        success: true,
        message:
          "Project analytics reports generated successfully",
        data: {
          project,
          analytics,
          reports
        }
      });
    } catch (error) {
      console.error(
        "Project Analytics Report API Error:",
        error
      );

      const statusCode =
        error.message ===
        "QA project not found."
          ? 404
          : 500;

      return res.status(statusCode).json({
        success: false,
        message:
          "Failed to generate project analytics reports",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-projects/:projectId/analytics",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const project =
        await getQAProjectById(projectId);

      const analytics =
        await generateProjectRunAnalytics(
          projectId
        );

      return res.json({
        success: true,
        message:
          "Project run analytics generated successfully",
        data: {
          project,
          analytics
        }
      });
    } catch (error) {
      const statusCode =
        error.message ===
        "QA project not found."
          ? 404
          : 500;

      return res.status(statusCode).json({
        success: false,
        message:
          "Failed to generate project analytics",
        error: error.message
      });
    }
  }
);

app.delete(
  "/qa-projects/:projectId/runs",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      await getQAProjectById(projectId);

      const result =
        await deleteProjectQARuns(
          projectId
        );

      return res.json({
        success: true,
        message:
          "Project QA run history deleted successfully",
        data: result
      });
    } catch (error) {
      const statusCode =
        error.message ===
        "QA project not found."
          ? 404
          : 500;

      return res.status(statusCode).json({
        success: false,
        message:
          "Failed to delete project runs",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-projects/:projectId",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const project =
        await getQAProjectById(projectId);

      return res.json({
        success: true,
        message:
          "QA project fetched successfully",
        data: {
          project
        }
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message:
          "Failed to fetch QA project",
        error: error.message
      });
    }
  }
);

app.patch(
  "/qa-projects/:projectId",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const project =
        await updateQAProject(
          projectId,
          req.body
        );

      return res.json({
        success: true,
        message:
          "QA project updated successfully",
        data: {
          project
        }
      });
    } catch (error) {
      const statusCode =
        error.message ===
        "QA project not found."
          ? 404
          : 400;

      return res.status(statusCode).json({
        success: false,
        message:
          "Failed to update QA project",
        error: error.message
      });
    }
  }
);

app.post(
  "/qa-projects/:projectId/run",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const project =
        await validateProjectCanRun(
          projectId
        );

      const pipelineResult =
        await runAutonomousQAPipeline(
          project.websiteUrl,
          {
            projectId:
              project.projectId,
            projectName:
              project.name
          }
        );

      const updatedProject =
        await updateQAProjectRunStats(
          projectId,
          pipelineResult
        );

      return res.json({
        success: true,
        message:
          "QA project run completed successfully",
        data: {
          project: updatedProject,
          pipelineResult
        }
      });
    } catch (error) {
      console.error(
        "Run QA Project API Error:",
        error
      );

      const statusCode =
        error.message.includes("paused") ||
        error.message.includes("archived")
          ? 409
          : error.message ===
              "QA project not found."
            ? 404
            : 500;

      return res.status(statusCode).json({
        success: false,
        message:
          "Failed to run QA project",
        error: error.message
      });
    }
  }
);

app.delete(
  "/qa-projects/:projectId",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const result =
        await deleteQAProject(
          projectId
        );

      return res.json({
        success: true,
        message:
          "QA project deleted successfully",
        data: result
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message:
          "Failed to delete QA project",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-executive-summary",
  async (req, res) => {
    try {
      const summary =
        await generateQAExecutiveSummary();

      return res.json({
        success: true,
        message:
          "Executive QA summary generated successfully",
        data: summary
      });
    } catch (error) {
      console.error(
        "Executive QA Summary API Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate executive QA summary",
        error: error.message
      });
    }
  }
);

app.get(
  "/qa-executive-summary/report",
  async (req, res) => {
    try {
      const summary =
        await generateQAExecutiveSummary();

      const reports =
        await generateQAExecutiveSummaryReports(
          summary
        );

      return res.json({
        success: true,
        message:
          "Executive QA summary reports generated successfully",
        data: {
          summary,
          reports
        }
      });
    } catch (error) {
      console.error(
        "Executive QA Summary Report API Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate executive QA summary reports",
        error: error.message
      });
    }
  }
);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
    method: req.method,
    path: req.path
  });
});

const PORT =
  process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(
    "===================================="
  );
  console.log(
    "🚀 ASEA Agent Backend Started"
  );
  console.log(
    `🌐 URL: http://localhost:${PORT}`
  );
  console.log("📦 Version: 3.0.0");
  console.log(
    "⚡ AI Provider: GroqCloud"
  );
  console.log(
    `🤖 AI Model: ${
      process.env.GROQ_MODEL ||
      "openai/gpt-oss-120b"
    }`
  );
  console.log(
    "📁 QA Project Management Agent enabled"
  );
  console.log(
    "🔄 QA Project Lifecycle Agent enabled"
  );
  console.log(
    "🧠 Project Run Intelligence Agent enabled"
  );
  console.log(
    "📊 Project Analytics Report Agent enabled"
  );
  console.log(
    "📌 Executive QA Summary Agent enabled"
  );
  console.log(
    "🚦 Platform Readiness Agent enabled"
  );
  console.log(
    "===================================="
  );
});