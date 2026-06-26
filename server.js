import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { inspectWebsite } from "./agents/browserAgent.js";

console.log("STEP 1: server.js file started");

dotenv.config();

console.log("STEP 2: dotenv loaded");

const app = express();

app.use(cors());
app.use(express.json());

console.log("STEP 3: express app created");

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ASEA Agent Backend is running",
    version: "1.0.0"
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

    const result = await inspectWebsite(websiteUrl);

    return res.json({
      success: true,
      message: "Website inspected successfully",
      data: result
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

console.log("STEP 4: Port selected:", PORT);

app.listen(PORT, () => {
  console.log("====================================");
  console.log("🚀 ASEA Agent Backend Started");
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log("====================================");
});