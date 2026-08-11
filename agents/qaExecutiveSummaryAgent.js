import { getQAProjects } from "./qaProjectAgent.js";
import { getQARunHistory } from "./qaRunHistoryAgent.js";
import { generateQARunAnalytics } from "./qaAnalyticsAgent.js";

function numberValue(value) {
  return Number(value || 0);
}

function getProjectStatusCounts(projects) {
  const counts = {
    active: 0,
    paused: 0,
    archived: 0,
    unknown: 0
  };

  projects.forEach((project) => {
    const status = project.status || "unknown";

    if (!counts[status]) {
      counts[status] = 0;
    }

    counts[status] += 1;
  });

  return counts;
}

function getProjectsWithFailures(projects) {
  return projects
    .filter((project) => numberValue(project.lastFailedTests) > 0)
    .map((project) => ({
      projectId: project.projectId,
      name: project.name,
      websiteUrl: project.websiteUrl,
      lastPassRate: numberValue(project.lastPassRate),
      lastFailedTests: numberValue(project.lastFailedTests),
      lastRunAt: project.lastRunAt
    }));
}

function determineOverallHealth({ totalRuns, averagePassRate, failedRuns }) {
  if (totalRuns === 0) {
    return "No Data";
  }

  if (averagePassRate >= 95 && failedRuns === 0) {
    return "Excellent";
  }

  if (averagePassRate >= 85) {
    return "Good";
  }

  if (averagePassRate >= 70) {
    return "Needs Attention";
  }

  return "Critical";
}

function determineRiskLevel({ totalRuns, averagePassRate, failedRuns, projectsWithFailures }) {
  if (totalRuns === 0) {
    return "Unknown";
  }

  if (averagePassRate >= 90 && failedRuns === 0 && projectsWithFailures.length === 0) {
    return "Low";
  }

  if (averagePassRate >= 75) {
    return "Medium";
  }

  return "High";
}

function buildTopRisks({ totalProjects, totalRuns, averagePassRate, failedRuns, worstRun, projectsWithFailures }) {
  const risks = [];

  if (totalProjects === 0) {
    risks.push({
      title: "No QA projects created",
      severity: "High",
      reason: "ASEA cannot provide project-level QA visibility without saved projects.",
      recommendation: "Create QA projects for important application URLs."
    });
  }

  if (totalRuns === 0) {
    risks.push({
      title: "No autonomous QA runs available",
      severity: "High",
      reason: "No execution history is available for trend or quality assessment.",
      recommendation: "Run the autonomous QA pipeline at least two times to generate useful history."
    });
  }

  if (totalRuns > 0 && averagePassRate < 80) {
    risks.push({
      title: "Average pass rate below target",
      severity: "High",
      reason: `Average pass rate is ${averagePassRate}%.`,
      recommendation: "Review failed tests, repair generated tests, and validate repaired test results."
    });
  }

  if (failedRuns > 0) {
    risks.push({
      title: "Failed QA pipeline runs detected",
      severity: "Medium",
      reason: `${failedRuns} run(s) failed during execution.`,
      recommendation: "Check failed run errors in QA run history and stabilize the pipeline."
    });
  }

  if (worstRun && numberValue(worstRun.passRate) < 70) {
    risks.push({
      title: "Low-quality worst run detected",
      severity: "High",
      reason: `Worst run pass rate is ${worstRun.passRate}%.`,
      recommendation: "Analyze the worst run and inspect its failed tests immediately."
    });
  }

  if (projectsWithFailures.length > 0) {
    risks.push({
      title: "Projects with recent failed tests",
      severity: "Medium",
      reason: `${projectsWithFailures.length} project(s) have failed tests in their latest run.`,
      recommendation: "Run failure analysis and self-healing repair on affected projects."
    });
  }

  if (risks.length === 0) {
    risks.push({
      title: "No major QA risk detected",
      severity: "Low",
      reason: "Current QA metrics are healthy.",
      recommendation: "Continue running QA regularly to maintain confidence."
    });
  }

  return risks;
}

function buildPriorityActions({ totalProjects, totalRuns, averagePassRate, projectsWithFailures }) {
  const actions = [];

  if (totalProjects === 0) {
    actions.push("Create QA projects for the main application pages.");
  }

  if (totalRuns === 0) {
    actions.push("Run the autonomous QA pipeline to generate baseline QA data.");
  }

  if (totalRuns === 1) {
    actions.push("Run the pipeline at least one more time to enable meaningful trend analysis.");
  }

  if (averagePassRate > 0 && averagePassRate < 80) {
    actions.push("Prioritize failed test repair and repair validation to improve pass rate.");
  }

  if (projectsWithFailures.length > 0) {
    actions.push("Review projects with failed latest tests and inspect failure analysis reports.");
  }

  actions.push("Keep generated Excel reports as evidence of automated QA execution.");
  actions.push("Use the executive summary in README/project demo to explain business value.");

  return actions;
}

function buildExecutiveNarrative({ totalProjects, totalRuns, averagePassRate, overallHealth, riskLevel }) {
  if (totalRuns === 0) {
    return "ASEA has project and analytics infrastructure available, but no completed QA run data is currently available. Run the autonomous QA pipeline to generate measurable QA intelligence.";
  }

  return `ASEA currently tracks ${totalProjects} QA project(s) and ${totalRuns} QA run(s). The average pass rate is ${averagePassRate}%, giving an overall QA health rating of ${overallHealth} and a risk level of ${riskLevel}.`;
}

export async function generateQAExecutiveSummary() {
  const projectsData = await getQAProjects({});
  const historyData = await getQARunHistory({});
  const analyticsData = await generateQARunAnalytics();

  const projects = Array.isArray(projectsData.projects)
    ? projectsData.projects
    : [];

  const runs = Array.isArray(historyData.runs)
    ? historyData.runs
    : [];

  const summary = analyticsData.summary || {};

  const totalProjects = projects.length;
  const totalRuns = numberValue(summary.totalRuns);
  const completedRuns = numberValue(summary.completedRuns);
  const failedRuns = numberValue(summary.failedRuns);
  const averagePassRate = numberValue(summary.averagePassRate);
  const averageExecutedTests = numberValue(summary.averageExecutedTests);
  const latestRunStatus = summary.latestRunStatus || "none";

  const projectStatusCounts = getProjectStatusCounts(projects);
  const projectsWithFailures = getProjectsWithFailures(projects);

  const overallHealth = determineOverallHealth({
    totalRuns,
    averagePassRate,
    failedRuns
  });

  const riskLevel = determineRiskLevel({
    totalRuns,
    averagePassRate,
    failedRuns,
    projectsWithFailures
  });

  const topRisks = buildTopRisks({
    totalProjects,
    totalRuns,
    averagePassRate,
    failedRuns,
    worstRun: analyticsData.worstRun,
    projectsWithFailures
  });

  const priorityActions = buildPriorityActions({
    totalProjects,
    totalRuns,
    averagePassRate,
    projectsWithFailures
  });

  const executiveNarrative = buildExecutiveNarrative({
    totalProjects,
    totalRuns,
    averagePassRate,
    overallHealth,
    riskLevel
  });

  return {
    generatedAt: new Date().toISOString(),
    executiveSummary: {
      overallHealth,
      riskLevel,
      executiveNarrative,
      totalProjects,
      totalRuns,
      completedRuns,
      failedRuns,
      averagePassRate,
      averageExecutedTests,
      latestRunStatus,
      trend: summary.trend || "Not Enough Data"
    },
    projectPortfolio: {
      totalProjects,
      statusCounts: projectStatusCounts,
      projectsWithRecentFailures: projectsWithFailures,
      projects: projects.map((project) => ({
        projectId: project.projectId,
        name: project.name,
        websiteUrl: project.websiteUrl,
        status: project.status,
        totalRuns: numberValue(project.totalRuns),
        lastRunAt: project.lastRunAt,
        lastRunStatus: project.lastRunStatus,
        lastPassRate: numberValue(project.lastPassRate),
        lastTotalTests: numberValue(project.lastTotalTests),
        lastPassedTests: numberValue(project.lastPassedTests),
        lastFailedTests: numberValue(project.lastFailedTests)
      }))
    },
    qaPerformance: {
      bestRun: analyticsData.bestRun || null,
      worstRun: analyticsData.worstRun || null,
      latestRun: analyticsData.latestRun || null,
      recentRuns: Array.isArray(analyticsData.recentRuns)
        ? analyticsData.recentRuns
        : [],
      runTrend: Array.isArray(analyticsData.runTrend)
        ? analyticsData.runTrend
        : []
    },
    risks: topRisks,
    priorityActions,
    interviewPitch: {
      oneLine:
        "ASEA is an AI-powered autonomous QA testing agent that discovers features, generates test cases, creates Playwright scripts, executes tests, analyzes failures, repairs tests, and reports QA intelligence.",
      technicalValue:
        "The system combines Playwright browser automation, Groq LLM intelligence, JSON-based storage, Excel reporting, project lifecycle management, and QA analytics.",
      businessValue:
        "ASEA converts raw website URLs into measurable QA insights such as pass rate, failure reasons, project quality trends, and executive-level QA health."
    }
  };
}