import {
  getProjectQARuns
} from "./qaRunHistoryAgent.js";

function getPassRate(run) {
  return Number(
    run?.pipelineSummary?.passRate || 0
  );
}

function getPassedCount(run) {
  return Number(
    run?.pipelineSummary?.passed || 0
  );
}

function getFailedCount(run) {
  return Number(
    run?.pipelineSummary?.failed || 0
  );
}

function getTotalTests(run) {
  return Number(
    run?.pipelineSummary
      ?.totalExecutedTests || 0
  );
}

function calculateAverage(values) {
  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {
    return 0;
  }

  const total = values.reduce(
    (sum, value) =>
      sum + Number(value || 0),
    0
  );

  return Number(
    (total / values.length).toFixed(2)
  );
}

function findBestRun(runs) {
  if (
    !Array.isArray(runs) ||
    runs.length === 0
  ) {
    return null;
  }

  return runs.reduce(
    (bestRun, currentRun) =>
      getPassRate(currentRun) >
      getPassRate(bestRun)
        ? currentRun
        : bestRun,
    runs[0]
  );
}

function findWorstRun(runs) {
  if (
    !Array.isArray(runs) ||
    runs.length === 0
  ) {
    return null;
  }

  return runs.reduce(
    (worstRun, currentRun) =>
      getPassRate(currentRun) <
      getPassRate(worstRun)
        ? currentRun
        : worstRun,
    runs[0]
  );
}

function determineTrend(completedRuns) {
  if (
    !Array.isArray(completedRuns) ||
    completedRuns.length < 2
  ) {
    return {
      direction: "Not Enough Data",
      difference: 0
    };
  }

  const chronologicalRuns = [
    ...completedRuns
  ].reverse();

  const firstPassRate =
    getPassRate(
      chronologicalRuns[0]
    );

  const latestPassRate =
    getPassRate(
      chronologicalRuns[
        chronologicalRuns.length - 1
      ]
    );

  const difference = Number(
    (
      latestPassRate -
      firstPassRate
    ).toFixed(2)
  );

  if (difference > 5) {
    return {
      direction: "Improving",
      difference
    };
  }

  if (difference < -5) {
    return {
      direction: "Declining",
      difference
    };
  }

  return {
    direction: "Stable",
    difference
  };
}

function summarizeRun(run) {
  if (!run) {
    return null;
  }

  return {
    runId: run.runId,
    projectId: run.projectId,
    projectName: run.projectName,
    websiteUrl: run.websiteUrl,
    status: run.status,
    passRate: getPassRate(run),
    totalTests: getTotalTests(run),
    passed: getPassedCount(run),
    failed: getFailedCount(run),
    durationSeconds:
      Number(
        run.durationSeconds || 0
      ),
    completedAt: run.completedAt
  };
}

export async function generateProjectRunAnalytics(
  projectId
) {
  const history =
    await getProjectQARuns(projectId);

  const runs = Array.isArray(history.runs)
    ? history.runs
    : [];

  const completedRuns =
    runs.filter(
      (run) =>
        run.status === "completed"
    );

  const failedRuns =
    runs.filter(
      (run) =>
        run.status === "failed"
    );

  const passRates =
    completedRuns.map(getPassRate);

  const executedTests =
    completedRuns.map(getTotalTests);

  const passedTests =
    completedRuns.map(getPassedCount);

  const failedTests =
    completedRuns.map(getFailedCount);

  const durations =
    runs.map(
      (run) =>
        Number(
          run.durationSeconds || 0
        )
    );

  const bestRun =
    findBestRun(completedRuns);

  const worstRun =
    findWorstRun(completedRuns);

  const latestRun =
    runs.length > 0
      ? runs[0]
      : null;

  const trend =
    determineTrend(completedRuns);

  return {
    projectId,

    projectName:
      runs.find(
        (run) => run.projectName
      )?.projectName || null,

    websiteUrl:
      runs.find(
        (run) => run.websiteUrl
      )?.websiteUrl || null,

    summary: {
      totalRuns: runs.length,
      completedRuns:
        completedRuns.length,
      failedRuns:
        failedRuns.length,

      averagePassRate:
        calculateAverage(passRates),

      averageExecutedTests:
        calculateAverage(
          executedTests
        ),

      averagePassedTests:
        calculateAverage(
          passedTests
        ),

      averageFailedTests:
        calculateAverage(
          failedTests
        ),

      averageDurationSeconds:
        calculateAverage(durations),

      trend: trend.direction,

      trendDifference:
        trend.difference,

      analyzedAt:
        new Date().toISOString()
    },

    latestRun:
      summarizeRun(latestRun),

    bestRun:
      summarizeRun(bestRun),

    worstRun:
      summarizeRun(worstRun),

    runTrend:
      completedRuns
        .slice()
        .reverse()
        .map(
          (run, index) => ({
            sequence: index + 1,
            ...summarizeRun(run)
          })
        ),

    recentRuns:
      runs
        .slice(0, 10)
        .map(summarizeRun)
  };
}