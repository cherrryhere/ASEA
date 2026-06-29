import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

const HISTORY_FILE_PATH = "storage/qaRunHistory.json";

async function ensureHistoryFile() {
  await fs.ensureDir("storage");

  const exists = await fs.pathExists(HISTORY_FILE_PATH);

  if (!exists) {
    await fs.writeJson(
      HISTORY_FILE_PATH,
      {
        runs: []
      },
      { spaces: 2 }
    );
  }
}

export async function saveQARunHistory(runData) {
  await ensureHistoryFile();

  const history = await fs.readJson(HISTORY_FILE_PATH);

  const runRecord = {
    runId: runData.runId || uuidv4(),
    websiteUrl: runData.websiteUrl || "",
    status: runData.status || "unknown",
    startedAt: runData.startedAt || "",
    completedAt: runData.completedAt || new Date().toISOString(),
    durationSeconds: runData.durationSeconds || 0,
    pipelineSummary: runData.pipelineSummary || {},
    reports: runData.reports || {},
    error: runData.error || null
  };

  history.runs.unshift(runRecord);

  await fs.writeJson(HISTORY_FILE_PATH, history, { spaces: 2 });

  return runRecord;
}

export async function getQARunHistory() {
  await ensureHistoryFile();

  const history = await fs.readJson(HISTORY_FILE_PATH);

  return {
    totalRuns: Array.isArray(history.runs) ? history.runs.length : 0,
    runs: Array.isArray(history.runs) ? history.runs : []
  };
}

export async function getLatestQARun() {
  const history = await getQARunHistory();

  return {
    latestRun: history.runs.length > 0 ? history.runs[0] : null
  };
}

export async function clearQARunHistory() {
  await fs.ensureDir("storage");

  await fs.writeJson(
    HISTORY_FILE_PATH,
    {
      runs: []
    },
    { spaces: 2 }
  );

  return {
    cleared: true,
    clearedAt: new Date().toISOString()
  };
}