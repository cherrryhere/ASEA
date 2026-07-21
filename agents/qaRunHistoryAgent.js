import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

const HISTORY_FILE_PATH = "storage/qaRunHistory.json";

async function ensureHistoryFile() {
  await fs.ensureDir("storage");

  const exists = await fs.pathExists(
    HISTORY_FILE_PATH
  );

  if (!exists) {
    await fs.writeJson(
      HISTORY_FILE_PATH,
      {
        runs: []
      },
      {
        spaces: 2
      }
    );
  }
}

async function readHistoryData() {
  await ensureHistoryFile();

  try {
    const historyData =
      await fs.readJson(HISTORY_FILE_PATH);

    return {
      runs: Array.isArray(historyData.runs)
        ? historyData.runs
        : []
    };
  } catch (error) {
    throw new Error(
      `Could not read QA run history: ${error.message}`
    );
  }
}

async function writeHistoryData(historyData) {
  await fs.writeJson(
    HISTORY_FILE_PATH,
    {
      runs: Array.isArray(historyData.runs)
        ? historyData.runs
        : []
    },
    {
      spaces: 2
    }
  );
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeRunRecord(runData) {
  return {
    runId:
      cleanText(runData?.runId) ||
      uuidv4(),

    projectId:
      cleanText(runData?.projectId) ||
      null,

    projectName:
      cleanText(runData?.projectName) ||
      null,

    websiteUrl:
      cleanText(runData?.websiteUrl),

    status:
      cleanText(runData?.status) ||
      "unknown",

    startedAt:
      cleanText(runData?.startedAt),

    completedAt:
      cleanText(runData?.completedAt) ||
      new Date().toISOString(),

    durationSeconds:
      Number(runData?.durationSeconds || 0),

    pipelineSummary:
      runData?.pipelineSummary &&
      typeof runData.pipelineSummary ===
        "object"
        ? runData.pipelineSummary
        : {},

    reports:
      runData?.reports &&
      typeof runData.reports === "object"
        ? runData.reports
        : {},

    error:
      runData?.error || null
  };
}

export async function saveQARunHistory(
  runData
) {
  const historyData =
    await readHistoryData();

  const runRecord =
    normalizeRunRecord(runData);

  historyData.runs.unshift(runRecord);

  await writeHistoryData(historyData);

  return runRecord;
}

export async function getQARunHistory({
  projectId = "",
  status = "",
  limit = null
} = {}) {
  const historyData =
    await readHistoryData();

  const cleanProjectId =
    cleanText(projectId);

  const cleanStatus =
    cleanText(status).toLowerCase();

  let runs = [...historyData.runs];

  if (cleanProjectId) {
    runs = runs.filter(
      (run) =>
        run.projectId === cleanProjectId
    );
  }

  if (cleanStatus) {
    runs = runs.filter(
      (run) =>
        cleanText(run.status).toLowerCase() ===
        cleanStatus
    );
  }

  const numericLimit = Number(limit);

  if (
    Number.isInteger(numericLimit) &&
    numericLimit > 0
  ) {
    runs = runs.slice(0, numericLimit);
  }

  return {
    totalRuns: runs.length,

    filters: {
      projectId:
        cleanProjectId || null,

      status:
        cleanStatus || null,

      limit:
        Number.isInteger(numericLimit) &&
        numericLimit > 0
          ? numericLimit
          : null
    },

    runs
  };
}

export async function getLatestQARun({
  projectId = ""
} = {}) {
  const history =
    await getQARunHistory({
      projectId,
      limit: 1
    });

  return {
    projectId:
      cleanText(projectId) || null,

    latestRun:
      history.runs.length > 0
        ? history.runs[0]
        : null
  };
}

export async function getProjectQARuns(
  projectId
) {
  const cleanProjectId =
    cleanText(projectId);

  if (!cleanProjectId) {
    throw new Error(
      "projectId is required."
    );
  }

  return getQARunHistory({
    projectId: cleanProjectId
  });
}

export async function getLatestProjectQARun(
  projectId
) {
  const cleanProjectId =
    cleanText(projectId);

  if (!cleanProjectId) {
    throw new Error(
      "projectId is required."
    );
  }

  return getLatestQARun({
    projectId: cleanProjectId
  });
}

export async function deleteProjectQARuns(
  projectId
) {
  const cleanProjectId =
    cleanText(projectId);

  if (!cleanProjectId) {
    throw new Error(
      "projectId is required."
    );
  }

  const historyData =
    await readHistoryData();

  const originalCount =
    historyData.runs.length;

  historyData.runs =
    historyData.runs.filter(
      (run) =>
        run.projectId !== cleanProjectId
    );

  const deletedRuns =
    originalCount -
    historyData.runs.length;

  await writeHistoryData(historyData);

  return {
    projectId: cleanProjectId,
    deletedRuns,
    deletedAt:
      new Date().toISOString()
  };
}

export async function clearQARunHistory() {
  await writeHistoryData({
    runs: []
  });

  return {
    cleared: true,
    clearedAt:
      new Date().toISOString()
  };
}