import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { inspectWebsite } from "./agents/browserAgent.js";
import { generateInspectionReport } from "./agents/reportAgent.js";
import { generateExcelReport } from "./agents/excelReportAgent.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ASEA Agent Backend is running",
    version: "1.1.0"
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("====================================");
  console.log("🚀 ASEA Agent Backend Started");
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log("📊 Excel report generation enabled");
  console.log("====================================");
});