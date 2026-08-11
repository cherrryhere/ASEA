import fs from "fs-extra";

const API_CATALOG = [
  {
    group: "Core",
    method: "GET",
    path: "/",
    description: "Backend welcome and metadata"
  },
  {
    group: "Core",
    method: "GET",
    path: "/health",
    description: "Backend health status"
  },
  {
    group: "Inspection",
    method: "POST",
    path: "/inspect",
    description: "Inspect a website and generate inspection reports"
  },
  {
    group: "AI Planning",
    method: "POST",
    path: "/plan",
    description: "Generate AI engineering plan using website knowledge"
  },
  {
    group: "Feature Discovery",
    method: "POST",
    path: "/discover-features",
    description: "Discover features using rule-based analysis"
  },
  {
    group: "Feature Discovery",
    method: "POST",
    path: "/ai-discover-features",
    description: "Discover features using Groq AI"
  },
  {
    group: "Test Generation",
    method: "POST",
    path: "/generate-test-cases",
    description: "Generate AI test cases from discovered features"
  },
  {
    group: "Test Generation",
    method: "POST",
    path: "/generate-playwright-tests",
    description: "Generate Playwright test scripts"
  },
  {
    group: "Test Execution",
    method: "POST",
    path: "/execute-generated-tests",
    description: "Execute generated Playwright tests"
  },
  {
    group: "Autonomous QA",
    method: "POST",
    path: "/run-autonomous-qa",
    description: "Run complete autonomous QA pipeline"
  },
  {
    group: "Failure Analysis",
    method: "POST",
    path: "/analyze-test-failures",
    description: "Analyze failed tests using AI"
  },
  {
    group: "Self-Healing",
    method: "POST",
    path: "/repair-generated-tests",
    description: "Repair generated test scripts"
  },
  {
    group: "Self-Healing",
    method: "POST",
    path: "/validate-repair",
    description: "Validate repaired tests"
  },
  {
    group: "Run History",
    method: "GET",
    path: "/qa-run-history",
    description: "Fetch QA run history"
  },
  {
    group: "Run History",
    method: "GET",
    path: "/qa-run-history/latest",
    description: "Fetch latest QA run"
  },
  {
    group: "Run History",
    method: "DELETE",
    path: "/qa-run-history",
    description: "Clear QA run history"
  },
  {
    group: "Analytics",
    method: "GET",
    path: "/qa-run-analytics",
    description: "Generate QA run analytics"
  },
  {
    group: "Analytics",
    method: "GET",
    path: "/qa-run-analytics/report",
    description: "Generate QA analytics Markdown and Excel reports"
  },
  {
    group: "Projects",
    method: "GET",
    path: "/qa-project-statuses",
    description: "Fetch allowed QA project statuses"
  },
  {
    group: "Projects",
    method: "POST",
    path: "/qa-projects",
    description: "Create QA project"
  },
  {
    group: "Projects",
    method: "GET",
    path: "/qa-projects",
    description: "Fetch QA projects"
  },
  {
    group: "Projects",
    method: "GET",
    path: "/qa-projects/:projectId",
    description: "Fetch one QA project"
  },
  {
    group: "Projects",
    method: "PATCH",
    path: "/qa-projects/:projectId",
    description: "Update QA project"
  },
  {
    group: "Projects",
    method: "DELETE",
    path: "/qa-projects/:projectId",
    description: "Delete QA project"
  },
  {
    group: "Project Runs",
    method: "POST",
    path: "/qa-projects/:projectId/run",
    description: "Run autonomous QA by project ID"
  },
  {
    group: "Project Runs",
    method: "GET",
    path: "/qa-projects/:projectId/runs",
    description: "Fetch project QA runs"
  },
  {
    group: "Project Runs",
    method: "GET",
    path: "/qa-projects/:projectId/runs/latest",
    description: "Fetch latest project QA run"
  },
  {
    group: "Project Runs",
    method: "DELETE",
    path: "/qa-projects/:projectId/runs",
    description: "Delete project QA run history"
  },
  {
    group: "Project Analytics",
    method: "GET",
    path: "/qa-projects/:projectId/analytics",
    description: "Generate project run analytics"
  },
  {
    group: "Project Analytics",
    method: "GET",
    path: "/qa-projects/:projectId/analytics/report",
    description: "Generate project analytics reports"
  },
  {
    group: "Executive Summary",
    method: "GET",
    path: "/qa-executive-summary",
    description: "Generate executive QA summary"
  },
  {
    group: "Executive Summary",
    method: "GET",
    path: "/qa-executive-summary/report",
    description: "Generate executive QA summary reports"
  },
  {
    group: "Platform",
    method: "GET",
    path: "/api-catalog",
    description: "Fetch complete API catalog"
  },
  {
    group: "Platform",
    method: "GET",
    path: "/platform-readiness",
    description: "Fetch SaaS backend readiness status"
  },
  {
    group: "Platform",
    method: "GET",
    path: "/platform-readiness/report",
    description: "Generate platform readiness report"
  }
];

function getApiGroups() {
  const groups = {};

  API_CATALOG.forEach((api) => {
    if (!groups[api.group]) {
      groups[api.group] = 0;
    }

    groups[api.group] += 1;
  });

  return groups;
}

async function fileExists(path) {
  return fs.pathExists(path);
}

async function readJsonSafely(path, fallback) {
  try {
    const exists = await fs.pathExists(path);

    if (!exists) {
      return fallback;
    }

    return await fs.readJson(path);
  } catch {
    return fallback;
  }
}

async function getPackageMetadata() {
  const packageData = await readJsonSafely("package.json", {});

  return {
    name: packageData.name || "unknown",
    version: packageData.version || "unknown",
    description: packageData.description || "",
    type: packageData.type || "",
    scripts: packageData.scripts || {},
    dependenciesCount: packageData.dependencies
      ? Object.keys(packageData.dependencies).length
      : 0,
    devDependenciesCount: packageData.devDependencies
      ? Object.keys(packageData.devDependencies).length
      : 0
  };
}

async function getStorageMetrics() {
  const projectsData = await readJsonSafely(
    "storage/qaProjects.json",
    { projects: [] }
  );

  const historyData = await readJsonSafely(
    "storage/qaRunHistory.json",
    { runs: [] }
  );

  const projects = Array.isArray(projectsData.projects)
    ? projectsData.projects
    : [];

  const runs = Array.isArray(historyData.runs)
    ? historyData.runs
    : [];

  const completedRuns = runs.filter(
    (run) => run.status === "completed"
  );

  const failedRuns = runs.filter(
    (run) => run.status === "failed"
  );

  return {
    totalProjects: projects.length,
    activeProjects: projects.filter(
      (project) => project.status === "active"
    ).length,
    pausedProjects: projects.filter(
      (project) => project.status === "paused"
    ).length,
    archivedProjects: projects.filter(
      (project) => project.status === "archived"
    ).length,
    totalRuns: runs.length,
    completedRuns: completedRuns.length,
    failedRuns: failedRuns.length,
    latestRun: runs.length > 0 ? runs[0] : null
  };
}

async function getRequiredFileChecks() {
  const requiredFiles = [
    "server.js",
    "package.json",
    "nodemon.json",
    ".gitignore",
    "config/groq.js",
    "config/playwright.js",
    "agents/browserAgent.js",
    "agents/autonomousQAAgent.js",
    "agents/qaRunHistoryAgent.js",
    "agents/qaAnalyticsAgent.js",
    "agents/qaProjectAgent.js",
    "agents/projectRunAnalyticsAgent.js",
    "agents/qaExecutiveSummaryAgent.js"
  ];

  const checks = [];

  for (const file of requiredFiles) {
    checks.push({
      path: file,
      exists: await fileExists(file)
    });
  }

  return checks;
}

async function getRequiredDirectoryChecks() {
  const requiredDirectories = [
    "agents",
    "config",
    "tools",
    "utils",
    "storage",
    "reports",
    "tests",
    "tests/generated",
    "tests/repaired"
  ];

  const checks = [];

  for (const directory of requiredDirectories) {
    checks.push({
      path: directory,
      exists: await fileExists(directory)
    });
  }

  return checks;
}

function getEnvironmentChecks() {
  return [
    {
      key: "GROQ_API_KEY",
      configured: Boolean(process.env.GROQ_API_KEY),
      required: true
    },
    {
      key: "PORT",
      configured: Boolean(process.env.PORT),
      required: false,
      value: process.env.PORT || "5050"
    },
    {
      key: "GROQ_MODEL",
      configured: Boolean(process.env.GROQ_MODEL),
      required: false,
      value:
        process.env.GROQ_MODEL ||
        "openai/gpt-oss-120b"
    }
  ];
}

function calculateReadinessScore({
  fileChecks,
  directoryChecks,
  environmentChecks
}) {
  const allChecks = [
    ...fileChecks,
    ...directoryChecks
  ];

  const fileDirectoryPassed = allChecks.filter(
    (check) => check.exists
  ).length;

  const requiredEnvironmentChecks =
    environmentChecks.filter((check) => check.required);

  const environmentPassed =
    requiredEnvironmentChecks.filter(
      (check) => check.configured
    ).length;

  const total =
    allChecks.length + requiredEnvironmentChecks.length;

  const passed =
    fileDirectoryPassed + environmentPassed;

  if (total === 0) {
    return 0;
  }

  return Number(((passed / total) * 100).toFixed(2));
}

function determineReadinessStatus(score) {
  if (score >= 95) {
    return "Production Demo Ready";
  }

  if (score >= 85) {
    return "Mostly Ready";
  }

  if (score >= 70) {
    return "Needs Minor Fixes";
  }

  return "Needs Attention";
}

function buildReadinessRecommendations({
  readinessScore,
  fileChecks,
  directoryChecks,
  environmentChecks,
  storageMetrics
}) {
  const recommendations = [];

  const missingFiles = fileChecks.filter(
    (check) => !check.exists
  );

  const missingDirectories = directoryChecks.filter(
    (check) => !check.exists
  );

  const missingRequiredEnv = environmentChecks.filter(
    (check) => check.required && !check.configured
  );

  if (missingFiles.length > 0) {
    recommendations.push(
      `Add missing required files: ${missingFiles
        .map((file) => file.path)
        .join(", ")}.`
    );
  }

  if (missingDirectories.length > 0) {
    recommendations.push(
      `Create missing required directories: ${missingDirectories
        .map((directory) => directory.path)
        .join(", ")}.`
    );
  }

  if (missingRequiredEnv.length > 0) {
    recommendations.push(
      "Configure required environment variables in .env."
    );
  }

  if (storageMetrics.totalProjects === 0) {
    recommendations.push(
      "Create at least one QA project for demo readiness."
    );
  }

  if (storageMetrics.totalRuns === 0) {
    recommendations.push(
      "Run the autonomous QA pipeline at least once before demo."
    );
  }

  if (readinessScore >= 95) {
    recommendations.push(
      "ASEA is ready for GitHub release, README polish, and resume showcase."
    );
  }

  return recommendations;
}

export function getAPICatalog() {
  return {
    totalApis: API_CATALOG.length,
    groups: getApiGroups(),
    apis: API_CATALOG
  };
}

export async function generatePlatformReadiness() {
  const packageMetadata = await getPackageMetadata();
  const storageMetrics = await getStorageMetrics();
  const fileChecks = await getRequiredFileChecks();
  const directoryChecks = await getRequiredDirectoryChecks();
  const environmentChecks = getEnvironmentChecks();

  const readinessScore = calculateReadinessScore({
    fileChecks,
    directoryChecks,
    environmentChecks
  });

  const readinessStatus =
    determineReadinessStatus(readinessScore);

  const recommendations =
    buildReadinessRecommendations({
      readinessScore,
      fileChecks,
      directoryChecks,
      environmentChecks,
      storageMetrics
    });

  return {
    generatedAt: new Date().toISOString(),
    platform: {
      name: "ASEA",
      fullName:
        "Autonomous Software Engineering Agent",
      version: "3.0.0",
      stage:
        "SaaS-Ready Backend Stabilization",
      aiProvider: "GroqCloud",
      model:
        process.env.GROQ_MODEL ||
        "openai/gpt-oss-120b"
    },
    readiness: {
      score: readinessScore,
      status: readinessStatus,
      recommendations
    },
    packageMetadata,
    storageMetrics,
    apiCatalog: getAPICatalog(),
    checks: {
      files: fileChecks,
      directories: directoryChecks,
      environment: environmentChecks
    },
    finalProjectPitch: {
      oneLine:
        "ASEA is an AI-powered autonomous QA platform backend that converts a website URL into feature discovery, test case generation, Playwright automation, test execution, failure analysis, repair validation, analytics, and executive reporting.",
      resumeBullet:
        "Built ASEA, an AI-powered autonomous QA backend using Node.js, Express, Playwright, Groq LLM, JSON storage, and Excel reporting to automate website inspection, test generation, execution, failure analysis, self-healing, analytics, and executive QA summaries.",
      interviewExplanation:
        "The project demonstrates backend engineering, browser automation, LLM integration, test automation, report generation, API design, project lifecycle management, and SaaS-style platform readiness."
    }
  };
}