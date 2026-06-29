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

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ASEA Agent Backend is running",
    version: "1.9.0"
  });
});

app.post("/inspect", async (req, res) => {
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        message: "websiteUrl is required"
      });
    }

    const knowledge = await inspectWebsite(websiteUrl);
    const markdownReport = await generateInspectionReport(knowledge);
    const excelReport = await generateExcelReport(knowledge);

    return res.json({
      success: true,
      message: "Website inspected and reports generated successfully",
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
    const { command, websiteUrl } = req.body;

    if (!command || !websiteUrl) {
      return res.status(400).json({
        success: false,
        message: "command and websiteUrl are required"
      });
    }

    const knowledge = await inspectWebsite(websiteUrl);
    const plan = await generateEngineeringPlan(command, knowledge);

    const reports = await generateAIPlanReports({
      command,
      websiteUrl,
      knowledge,
      plan
    });

    return res.json({
      success: true,
      message: "AI engineering plan and reports generated successfully",
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
      message: "AI engineering plan generation failed",
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

    const knowledge = await inspectWebsite(websiteUrl);
    const featureDiscovery = discoverFeatures(knowledge);
    const reports = await generateFeatureReports(featureDiscovery);

    return res.json({
      success: true,
      message: "Features discovered and reports generated successfully",
      data: {
        websiteUrl,
        knowledge,
        featureDiscovery,
        reports
      }
    });
  } catch (error) {
    console.error("Feature Discovery API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Feature discovery failed",
      error: error.message
    });
  }
});

app.post("/ai-discover-features", async (req, res) => {
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        message: "websiteUrl is required"
      });
    }

    const knowledge = await inspectWebsite(websiteUrl);
    const aiFeatureDiscovery = await discoverFeaturesWithAI(knowledge);
    const reports = await generateFeatureReports(aiFeatureDiscovery);

    return res.json({
      success: true,
      message: "AI features discovered and reports generated successfully",
      data: {
        websiteUrl,
        knowledge,
        featureDiscovery: aiFeatureDiscovery,
        reports
      }
    });
  } catch (error) {
    console.error("AI Feature Discovery API Error:", error);

    return res.status(500).json({
      success: false,
      message: "AI feature discovery failed",
      error: error.message
    });
  }
});

app.post("/generate-test-cases", async (req, res) => {
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        message: "websiteUrl is required"
      });
    }

    const knowledge = await inspectWebsite(websiteUrl);
    const featureDiscovery = await discoverFeaturesWithAI(knowledge);
    const testCases = await generateTestCasesFromFeatures(featureDiscovery);
    const reports = await generateTestCaseReports(testCases);

    return res.json({
      success: true,
      message: "Test cases generated and reports created successfully",
      data: {
        websiteUrl,
        knowledge,
        featureDiscovery,
        testCases,
        reports
      }
    });
  } catch (error) {
    console.error("Test Case Generation API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Test case generation failed",
      error: error.message
    });
  }
});

app.post("/generate-playwright-tests", async (req, res) => {
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        message: "websiteUrl is required"
      });
    }

    const knowledge = await inspectWebsite(websiteUrl);
    const featureDiscovery = await discoverFeaturesWithAI(knowledge);
    const testCases = await generateTestCasesFromFeatures(featureDiscovery);

    const playwrightScripts = await generatePlaywrightScripts({
      websiteUrl,
      testCaseData: testCases
    });

    return res.json({
      success: true,
      message: "Playwright test scripts generated successfully",
      data: {
        websiteUrl,
        knowledge,
        featureDiscovery,
        testCases,
        playwrightScripts
      }
    });
  } catch (error) {
    console.error("Playwright Test Generation API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Playwright test generation failed",
      error: error.message
    });
  }
});

app.post("/execute-generated-tests", async (req, res) => {
  try {
    const executionData = await executeGeneratedTests();
    const reports = await generateTestExecutionReports(executionData);

    return res.json({
      success: true,
      message: "Generated tests executed and reports created successfully",
      data: {
        executionData,
        reports
      }
    });
  } catch (error) {
    console.error("Test Execution API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Test execution failed",
      error: error.message
    });
  }
});

app.post("/run-autonomous-qa", async (req, res) => {
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        message: "websiteUrl is required"
      });
    }

    const result = await runAutonomousQAPipeline(websiteUrl);

    return res.json({
      success: true,
      message: "Autonomous QA pipeline completed successfully",
      data: result
    });
  } catch (error) {
    console.error("Autonomous QA Pipeline API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Autonomous QA pipeline failed",
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log("====================================");
  console.log("🚀 ASEA Agent Backend Started");
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log("🧠 Groq Planner Agent enabled");
  console.log("📊 AI Plan Reports enabled");
  console.log("🔎 Rule-Based Feature Discovery enabled");
  console.log("🤖 AI Feature Discovery enabled");
  console.log("🧪 Test Case Generator enabled");
  console.log("🎭 Playwright Test Script Generator enabled");
  console.log("✅ Test Executor Agent enabled");
  console.log("🚀 Autonomous QA Pipeline enabled");
  console.log("====================================");
});