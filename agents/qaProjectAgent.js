import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

const PROJECTS_FILE_PATH = "storage/qaProjects.json";

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

function normalizeUrl(url) {
  return String(url || "").trim();
}

function isValidWebsiteUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export async function createQAProject({ name, websiteUrl, description }) {
  await ensureProjectsFile();

  const cleanName = String(name || "").trim();
  const cleanWebsiteUrl = normalizeUrl(websiteUrl);
  const cleanDescription = String(description || "").trim();

  if (!cleanName) {
    throw new Error("Project name is required.");
  }

  if (!cleanWebsiteUrl) {
    throw new Error("websiteUrl is required.");
  }

  if (!isValidWebsiteUrl(cleanWebsiteUrl)) {
    throw new Error("websiteUrl must be a valid http or https URL.");
  }

  const projectsData = await fs.readJson(PROJECTS_FILE_PATH);

  const duplicateProject = projectsData.projects.find(
    (project) => project.websiteUrl === cleanWebsiteUrl
  );

  if (duplicateProject) {
    throw new Error("A project with this websiteUrl already exists.");
  }

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

  await fs.writeJson(PROJECTS_FILE_PATH, projectsData, { spaces: 2 });

  return project;
}

export async function getQAProjects() {
  await ensureProjectsFile();

  const projectsData = await fs.readJson(PROJECTS_FILE_PATH);
  const projects = Array.isArray(projectsData.projects)
    ? projectsData.projects
    : [];

  return {
    totalProjects: projects.length,
    projects
  };
}

export async function getQAProjectById(projectId) {
  await ensureProjectsFile();

  const projectsData = await fs.readJson(PROJECTS_FILE_PATH);

  const project = projectsData.projects.find(
    (item) => item.projectId === projectId
  );

  if (!project) {
    throw new Error("QA project not found.");
  }

  return project;
}

export async function updateQAProjectRunStats(projectId, pipelineResult) {
  await ensureProjectsFile();

  const projectsData = await fs.readJson(PROJECTS_FILE_PATH);

  const projectIndex = projectsData.projects.findIndex(
    (item) => item.projectId === projectId
  );

  if (projectIndex === -1) {
    throw new Error("QA project not found.");
  }

  const summary = pipelineResult.pipelineSummary || {};
  const now = new Date().toISOString();

  const existingProject = projectsData.projects[projectIndex];

  const updatedProject = {
    ...existingProject,
    updatedAt: now,
    lastRunAt: pipelineResult.completedAt || now,
    lastRunStatus: pipelineResult.status || "completed",
    lastPassRate: summary.passRate ?? null,
    lastTotalTests: summary.totalExecutedTests ?? null,
    lastPassedTests: summary.passed ?? null,
    lastFailedTests: summary.failed ?? null,
    totalRuns: Number(existingProject.totalRuns || 0) + 1
  };

  projectsData.projects[projectIndex] = updatedProject;

  await fs.writeJson(PROJECTS_FILE_PATH, projectsData, { spaces: 2 });

  return updatedProject;
}

export async function deleteQAProject(projectId) {
  await ensureProjectsFile();

  const projectsData = await fs.readJson(PROJECTS_FILE_PATH);

  const existingProject = projectsData.projects.find(
    (item) => item.projectId === projectId
  );

  if (!existingProject) {
    throw new Error("QA project not found.");
  }

  projectsData.projects = projectsData.projects.filter(
    (item) => item.projectId !== projectId
  );

  await fs.writeJson(PROJECTS_FILE_PATH, projectsData, { spaces: 2 });

  return {
    deleted: true,
    projectId,
    deletedAt: new Date().toISOString()
  };
}