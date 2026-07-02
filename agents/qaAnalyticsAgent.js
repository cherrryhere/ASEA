import fs from "fs-extra";

const HISTORY_FILE_PATH = "storage/qaRunHistory.json";

async function loadHistory() {
  await fs.ensureDir("storage");

  const exists = await fs.pathExists(HISTORY_FILE_PATH);

  if (!exists) {
    return {
      runs: []
    };
  }

  return fs.readJson(HISTORY_FILE_PATH);
}

function getPassRate(run) {
  return Number(run?.pipelineSummary?.passRate || 0);
}

function getPassed(run) {
  return Number(run?.pipelineSummary?.passed || 0);
}

function getFailed(run) {
  return Number(run?.pipelineSummary?.failed || 0);
}

function getTotalExecutedTests(run) {
  return Number(run?.pipelineSummary?.totalExecutedTests || 0);
}

function calculateAverage(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return 0;
  }

  const total = numbers.reduce((sum, value) => sum + Number(value || 0), 0);

  return Number((total / numbers.length).toFixed(2));
}

function determineTrend(runs) {
  if (!Array.isArray(runs) || runs.length < 2) {
    return "Not Enough Data";
  }

  const chronologicalRuns = [...runs].reverse();

  const firstPassRate = getPassRate(chronologicalRuns[0]);
  const latestPassRate = getPassRate(chronologicalRuns[chronologicalRuns.length - 1]);

  const difference = Number((latestPassRate - firstPassRate).toFixed(2));

  if (difference > 5) {
    return "Improving";
  }

  if (difference < -5) {
    return "Declining";
  }

  return "Stable";
}

function findBestRun(runs) {
  if (!Array.isArray(runs) || runs.length === 0) {
    return null;
  }

  return runs.reduce((best, current) => {
    return getPassRate(current) > getPassRate(best) ? current : best;
  }, runs[0]);
}

function findWorstRun(runs) {
  if (!Array.isArray(runs) || runs.length === 0) {
    return null;
  }

  return runs.reduce((worst, current) => {
    return getPassRate(current) < getPassRate(worst) ? current : worst;
  }, runs[0]);
}

function countByStatus(runs) {
  const counts = {
    completed: 0,
    failed: 0,
    unknown: 0
  };

  runs.forEach((run) => {
    const status = run.status || "unknown";

    if (!counts[status]) {
      counts[status] = 0;
    }

    counts[status] += 1;
  });

  return counts;
}

export async function generateQARunAnalytics() {
  const history = await loadHistory();

  const runs = Array.isArray(history.runs) ? history.runs : [];

  const completedRuns = runs.filter((run) => run.status === "completed");
  const failedRuns = runs.filter((run) => run.status === "failed");

  const passRates = completedRuns.map(getPassRate);
  const totalTests = completedRuns.map(getTotalExecutedTests);
  const passedTests = completedRuns.map(getPassed);
  const failedTests = completedRuns.map(getFailed);

  const bestRun = findBestRun(completedRuns);
  const worstRun = findWorstRun(completedRuns);
  const latestRun = runs.length > 0 ? runs[0] : null;

  const analytics = {
    summary: {
      totalRuns: runs.length,
      completedRuns: completedRuns.length,
      failedRuns: failedRuns.length,
      averagePassRate: calculateAverage(passRates),
      averageExecutedTests: calculateAverage(totalTests),
      averagePassedTests: calculateAverage(passedTests),
      averageFailedTests: calculateAverage(failedTests),
      trend: determineTrend(completedRuns),
      latestRunStatus: latestRun?.status || "none",
      analyzedAt: new Date().toISOString()
    },
    statusCounts: countByStatus(runs),
    bestRun: bestRun
      ? {
          runId: bestRun.runId,
          websiteUrl: bestRun.websiteUrl,
          passRate: getPassRate(bestRun),
          passed: getPassed(bestRun),
          failed: getFailed(bestRun),
          completedAt: bestRun.completedAt
        }
      : null,
    worstRun: worstRun
      ? {
          runId: worstRun.runId,
          websiteUrl: worstRun.websiteUrl,
          passRate: getPassRate(worstRun),
          passed: getPassed(worstRun),
          failed: getFailed(worstRun),
          completedAt: worstRun.completedAt
        }
      : null,
    latestRun: latestRun
      ? {
          runId: latestRun.runId,
          websiteUrl: latestRun.websiteUrl,
          status: latestRun.status,
          durationSeconds: latestRun.durationSeconds,
          pipelineSummary: latestRun.pipelineSummary,
          completedAt: latestRun.completedAt
        }
      : null,
    runTrend: completedRuns
      .slice()
      .reverse()
      .map((run, index) => ({
        sequence: index + 1,
        runId: run.runId,
        websiteUrl: run.websiteUrl,
        passRate: getPassRate(run),
        passed: getPassed(run),
        failed: getFailed(run),
        totalExecutedTests: getTotalExecutedTests(run),
        completedAt: run.completedAt
      })),
    recentRuns: runs.slice(0, 10).map((run) => ({
      runId: run.runId,
      websiteUrl: run.websiteUrl,
      status: run.status,
      passRate: getPassRate(run),
      passed: getPassed(run),
      failed: getFailed(run),
      durationSeconds: run.durationSeconds,
      completedAt: run.completedAt,
      error: run.error || null
    }))
  };

  return analytics;
}