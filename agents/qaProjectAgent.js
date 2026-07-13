import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

const PROJECTS_FILE_PATH = "storage/qaProjects.json";

const ALLOWED_PROJECT_STATUSES = [
  "active",
  "paused",
  "archived"
];

async function ensureProjectsFile() {
  await fs.ensureDir("storage");

  const exists = await fs.pathExists(PROJECTS_FILE_PATH);

  if (!exists) {
    await fs.writeJson(
      PROJECTS_FILE_PATH,
      {
        projects: []
      },
      { spaces: 2 }
    );
  }
}

async function readProjectsData() {
  await ensureProjectsFile();

  try {
    const projectsData = await fs.readJson(PROJECTS_FILE_PATH);

    return {
      projects: Array.isArray(projectsData.projects)
        ? projectsData.projects
        : []
    };
  } catch (error) {
    throw new Error(
      `Could not read QA projects storage: ${error.message}`
    );
  }
}

async function writeProjectsData(projectsData) {
  await fs.writeJson(
    PROJECTS_FILE_PATH,
    {
      projects: Array.isArray(projectsData.projects)
        ? projectsData.projects
        : []
    },
    { spaces: 2 }
  );
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeUrl(value) {
  return normalizeText(value);
}

function isValidWebsiteUrl(websiteUrl) {
  try {
    const parsedUrl = new URL(websiteUrl);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function validateProjectStatus(status) {
  if (!ALLOWED_PROJECT_STATUSES.includes(status)) {
    throw new Error(
      `Invalid project status. Allowed statuses: ${ALLOWED_PROJECT_STATUSES.join(
        ", "
      )}.`
    );
  }
}

function findProjectIndex(projects, projectId) {
  return projects.findIndex(
    (project) => project.projectId === projectId
  );
}

function ensureUniqueWebsiteUrl(
  projects,
  websiteUrl,
  excludedProjectId = null
) {
  const duplicateProject = projects.find(
    (project) =>
      project.websiteUrl === websiteUrl &&
      project.projectId !== excludedProjectId
  );

  if (duplicateProject) {
    throw new Error(
      "A QA project with this websiteUrl already exists."
    );
  }
}

export async function createQAProject({
  name,
  websiteUrl,
  description = ""
}) {
  const projectsData = await readProjectsData();

  const cleanName = normalizeText(name);
  const cleanWebsiteUrl = normalizeUrl(websiteUrl);
  const cleanDescription = normalizeText(description);

  if (!cleanName) {
    throw new Error("Project name is required.");
  }

  if (!cleanWebsiteUrl) {
    throw new Error("websiteUrl is required.");
  }

  if (!isValidWebsiteUrl(cleanWebsiteUrl)) {
    throw new Error(
      "websiteUrl must be a valid http or https URL."
    );
  }

  ensureUniqueWebsiteUrl(
    projectsData.projects,
    cleanWebsiteUrl
  );

  const now = new Date().toISOString();

  const project = {
    projectId: uuidv4(),
    name: cleanName,
    websiteUrl: cleanWebsiteUrl,
    description: cleanDescription,
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    lastRunStatus: null,
    lastPassRate: null,
    lastTotalTests: null,
    lastPassedTests: null,
    lastFailedTests: null,
    totalRuns: 0
  };

  projectsData.projects.unshift(project);

  await writeProjectsData(projectsData);

  return project;
}

export async function getQAProjects({
  status = "",
  search = ""
} = {}) {
  const projectsData = await readProjectsData();

  const cleanStatus = normalizeText(status).toLowerCase();
  const cleanSearch = normalizeText(search).toLowerCase();

  if (cleanStatus) {
    validateProjectStatus(cleanStatus);
  }

  let projects = [...projectsData.projects];

  if (cleanStatus) {
    projects = projects.filter(
      (project) => project.status === cleanStatus
    );
  }

  if (cleanSearch) {
    projects = projects.filter((project) => {
      const searchableText = [
        project.name,
        project.websiteUrl,
        project.description,
        project.status
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(cleanSearch);
    });
  }

  return {
    totalProjects: projects.length,
    filters: {
      status: cleanStatus || null,
      search: cleanSearch || null
    },
    projects
  };
}

export async function getQAProjectById(projectId) {
  const projectsData = await readProjectsData();

  const project = projectsData.projects.find(
    (item) => item.projectId === projectId
  );

  if (!project) {
    throw new Error("QA project not found.");
  }

  return project;
}

export async function updateQAProject(
  projectId,
  {
    name,
    websiteUrl,
    description,
    status
  }
) {
  const projectsData = await readProjectsData();

  const projectIndex = findProjectIndex(
    projectsData.projects,
    projectId
  );

  if (projectIndex === -1) {
    throw new Error("QA project not found.");
  }

  const existingProject =
    projectsData.projects[projectIndex];

  const updatedProject = {
    ...existingProject
  };

  if (name !== undefined) {
    const cleanName = normalizeText(name);

    if (!cleanName) {
      throw new Error("Project name cannot be empty.");
    }

    updatedProject.name = cleanName;
  }

  if (websiteUrl !== undefined) {
    const cleanWebsiteUrl = normalizeUrl(websiteUrl);

    if (!cleanWebsiteUrl) {
      throw new Error("websiteUrl cannot be empty.");
    }

    if (!isValidWebsiteUrl(cleanWebsiteUrl)) {
      throw new Error(
        "websiteUrl must be a valid http or https URL."
      );
    }

    ensureUniqueWebsiteUrl(
      projectsData.projects,
      cleanWebsiteUrl,
      projectId
    );

    updatedProject.websiteUrl = cleanWebsiteUrl;
  }

  if (description !== undefined) {
    updatedProject.description =
      normalizeText(description);
  }

  if (status !== undefined) {
    const cleanStatus = normalizeText(
      status
    ).toLowerCase();

    validateProjectStatus(cleanStatus);

    updatedProject.status = cleanStatus;
  }

  updatedProject.updatedAt =
    new Date().toISOString();

  projectsData.projects[projectIndex] =
    updatedProject;

  await writeProjectsData(projectsData);

  return updatedProject;
}

export async function updateQAProjectRunStats(
  projectId,
  pipelineResult
) {
  const projectsData = await readProjectsData();

  const projectIndex = findProjectIndex(
    projectsData.projects,
    projectId
  );

  if (projectIndex === -1) {
    throw new Error("QA project not found.");
  }

  const existingProject =
    projectsData.projects[projectIndex];

  const summary =
    pipelineResult.pipelineSummary || {};

  const now = new Date().toISOString();

  const updatedProject = {
    ...existingProject,
    updatedAt: now,
    lastRunAt:
      pipelineResult.completedAt || now,
    lastRunStatus:
      pipelineResult.status || "completed",
    lastPassRate:
      summary.passRate ?? null,
    lastTotalTests:
      summary.totalExecutedTests ?? null,
    lastPassedTests:
      summary.passed ?? null,
    lastFailedTests:
      summary.failed ?? null,
    totalRuns:
      Number(existingProject.totalRuns || 0) + 1
  };

  projectsData.projects[projectIndex] =
    updatedProject;

  await writeProjectsData(projectsData);

  return updatedProject;
}

export async function validateProjectCanRun(projectId) {
  const project = await getQAProjectById(projectId);

  if (project.status === "paused") {
    throw new Error(
      "This QA project is paused. Change its status to active before running it."
    );
  }

  if (project.status === "archived") {
    throw new Error(
      "This QA project is archived. Change its status to active before running it."
    );
  }

  if (project.status !== "active") {
    throw new Error(
      `This project cannot run because its status is ${project.status}.`
    );
  }

  return project;
}

export async function deleteQAProject(projectId) {
  const projectsData = await readProjectsData();

  const projectIndex = findProjectIndex(
    projectsData.projects,
    projectId
  );

  if (projectIndex === -1) {
    throw new Error("QA project not found.");
  }

  const deletedProject =
    projectsData.projects[projectIndex];

  projectsData.projects.splice(projectIndex, 1);

  await writeProjectsData(projectsData);

  return {
    deleted: true,
    projectId,
    projectName: deletedProject.name,
    deletedAt: new Date().toISOString()
  };
}

export function getAllowedProjectStatuses() {
  return [...ALLOWED_PROJECT_STATUSES];
}