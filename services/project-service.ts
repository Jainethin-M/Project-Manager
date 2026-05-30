import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import type {
  CommandItem,
  CommandType,
  DatabaseProvider,
  DevVaultBackup,
  DevelopmentEnvironment,
  EnvironmentValue,
  HighlightItem,
  HostedEnvironment,
  HostingProvider,
  Project,
  ProjectCard,
  ProjectInput,
  ProjectMetadata,
  ProjectStatus,
} from "@/types/project";
import { COMMAND_TYPES, DATABASE_PROVIDERS, HOSTING_PROVIDERS, PROJECT_STATUSES } from "@/types/project";

type ProjectDocument = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  stack: string[];
  location: {
    local: string;
    git: string;
  };
  development: DevelopmentEnvironment;
  hosted: HostedEnvironment;
  metadata: ProjectMetadata;
  environmentValues: EnvironmentValue[];
  commands: CommandItem[];
  highlights: HighlightItem[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

const PROTECTED_SECRET_PLACEHOLDER = "[encrypted secret]";

const emptyDevelopment: DevelopmentEnvironment = {
  backend: { port: "", url: "", storagePath: "" },
  frontend: { port: "", url: "", storagePath: "" },
  database: { port: "", url: "", storagePath: "" },
};

const emptyHosted: HostedEnvironment = {
  backend: { url: "", provider: "None" },
  frontend: { url: "", provider: "None" },
  database: { url: "", provider: "None" },
};

const emptyMetadata: ProjectMetadata = {
  repositoryUrl: "",
  frontendRepositoryUrl: "",
  backendRepositoryUrl: "",
  hostingProvider: "None",
  databaseProvider: "None",
  hostingEnvironment: "",
  hostingDashboardUrl: "",
  databaseName: "",
  notes: "",
};

function now() {
  return new Date().toISOString();
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function bool(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => text(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        return parseStringArray(JSON.parse(trimmed) as unknown);
      } catch {
        return [];
      }
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function statusValue(value: unknown): ProjectStatus {
  const candidate = text(value) as ProjectStatus;
  return PROJECT_STATUSES.includes(candidate) ? candidate : "active";
}

function providerValue(value: unknown): HostingProvider {
  const candidate = text(value) as HostingProvider;
  return HOSTING_PROVIDERS.includes(candidate) ? candidate : "None";
}

function databaseProviderValue(value: unknown): DatabaseProvider {
  const candidate = text(value) as DatabaseProvider;
  return DATABASE_PROVIDERS.includes(candidate) ? candidate : "None";
}

function commandTypeValue(value: unknown): CommandType {
  const candidate = text(value) as CommandType;
  return COMMAND_TYPES.includes(candidate) ? candidate : "other";
}

function normalizeDevelopmentService(value: unknown) {
  const input = isObject(value) ? value : {};
  return {
    port: text(input.port),
    url: text(input.url),
    storagePath: text(input.storagePath),
  };
}

function normalizeDevelopment(value: unknown): DevelopmentEnvironment {
  const input = isObject(value) ? value : {};
  return {
    backend: normalizeDevelopmentService(input.backend),
    frontend: normalizeDevelopmentService(input.frontend),
    database: normalizeDevelopmentService(input.database),
  };
}

function normalizeHosted(value: unknown): HostedEnvironment {
  const input = isObject(value) ? value : {};
  const backend = isObject(input.backend) ? input.backend : {};
  const frontend = isObject(input.frontend) ? input.frontend : {};
  const database = isObject(input.database) ? input.database : {};

  return {
    backend: { url: text(backend.url), provider: providerValue(backend.provider) },
    frontend: { url: text(frontend.url), provider: providerValue(frontend.provider) },
    database: { url: text(database.url), provider: databaseProviderValue(database.provider) },
  };
}

function normalizeMetadata(raw: Record<string, unknown>, location: { git: string }, hosted: HostedEnvironment): ProjectMetadata {
  const input = isObject(raw.metadata) ? raw.metadata : {};
  return {
    repositoryUrl: text(input.repositoryUrl) || location.git,
    frontendRepositoryUrl: text(input.frontendRepositoryUrl),
    backendRepositoryUrl: text(input.backendRepositoryUrl),
    hostingProvider: providerValue(input.hostingProvider) !== "None"
      ? providerValue(input.hostingProvider)
      : hosted.frontend.provider !== "None"
        ? hosted.frontend.provider
        : hosted.backend.provider,
    databaseProvider: databaseProviderValue(input.databaseProvider) !== "None"
      ? databaseProviderValue(input.databaseProvider)
      : hosted.database.provider,
    hostingEnvironment: text(input.hostingEnvironment),
    hostingDashboardUrl: text(input.hostingDashboardUrl),
    databaseName: text(input.databaseName),
    notes: text(input.notes),
  };
}

function normalizeEnvironmentValue(value: unknown): EnvironmentValue | null {
  if (!isObject(value)) return null;
  const item: EnvironmentValue = {
    id: text(value.id) || undefined,
    key: text(value.key),
    value: text(value.value),
    encrypted: bool(value.encrypted),
    hashedValue: text(value.hashedValue) || undefined,
  };
  return item.key || item.value || item.hashedValue ? item : null;
}

function normalizeCommand(value: unknown): CommandItem | null {
  if (!isObject(value)) return null;
  const item: CommandItem = {
    id: text(value.id) || undefined,
    type: commandTypeValue(value.type),
    title: text(value.title),
    command: text(value.command),
  };
  return item.title || item.command ? item : null;
}

function normalizeHighlight(value: unknown): HighlightItem | null {
  if (!isObject(value)) return null;
  const item: HighlightItem = {
    id: text(value.id) || undefined,
    notes: text(value.notes),
    links: parseStringArray(value.links),
  };
  return item.notes || item.links.length > 0 ? item : null;
}

function normalizeArray<T>(value: unknown, mapper: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(mapper).filter((item): item is T => item !== null);
}

function hashSecret(value: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function isHashedSecret(value: string) {
  return value.startsWith("scrypt$");
}

function getSecretPassword() {
  const explicit = process.env.DEVVAULT_SECRET_PASSWORD?.trim();
  if (explicit) return explicit;

  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error("DEVVAULT_SECRET_PASSWORD or MONGODB_URI is required to protect secrets.");
  }

  try {
    const parsed = new URL(mongoUri);
    return decodeURIComponent(parsed.password || "");
  } catch {
    return "";
  }
}

function getSecretKey(password = getSecretPassword()) {
  if (!password) {
    throw new Error("No secret password could be derived from .env.");
  }
  return scryptSync(password, "devvault-secret-salt", 32);
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc$${iv.toString("hex")}$${tag.toString("hex")}$${encrypted.toString("hex")}`;
}

function decryptSecret(value: string, password = getSecretPassword()) {
  const [prefix, ivHex, tagHex, encryptedHex] = value.split("$");
  if (prefix !== "enc" || !ivHex || !tagHex || !encryptedHex) {
    throw new Error("Encrypted secret format is invalid.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getSecretKey(password), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function isValidRevealPassword(candidate: string) {
  const expected = getSecretPassword();
  const received = candidate.trim();

  if (!expected || !received) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function normalizeEnvValueForStorage(item: EnvironmentValue): EnvironmentValue {
  const base: EnvironmentValue = {
    id: item.id || randomUUID(),
    key: item.key,
    value: item.value,
    encrypted: Boolean(item.encrypted),
  };

  if (!base.encrypted) {
    return { ...base, hashedValue: undefined, encryptedValue: undefined };
  }

  const existingHash = text(item.hashedValue);
  const existingEncrypted = text(item.encryptedValue);
  const nextEncrypted = item.value
    ? encryptSecret(item.value)
    : existingEncrypted.startsWith("enc$")
      ? existingEncrypted
      : "";
  const nextHash = !nextEncrypted && existingHash && isHashedSecret(existingHash)
    ? existingHash
    : "";

  return {
    ...base,
    value: "",
    hashedValue: nextHash || undefined,
    encryptedValue: nextEncrypted || undefined,
  };
}

function sanitizeEnvironmentValue(item: EnvironmentValue): EnvironmentValue {
  if (!item.encrypted) {
    return { ...item };
  }

  return {
    ...item,
    value: PROTECTED_SECRET_PLACEHOLDER,
  };
}

export function normalizeProjectInput(raw: unknown): ProjectInput {
  if (!isObject(raw)) {
    throw new Error("Project payload must be an object.");
  }

  const name = text(raw.name);
  if (!name) {
    throw new Error("Project name is required.");
  }

  const location = isObject(raw.location) ? raw.location : {};
  const development = isObject(raw.development) ? normalizeDevelopment(raw.development) : emptyDevelopment;
  const hosted = isObject(raw.hosted) ? normalizeHosted(raw.hosted) : emptyHosted;

  return {
    name,
    description: text(raw.description),
    status: statusValue(raw.status),
    stack: parseStringArray(raw.stack),
    location: {
      local: text(location.local),
      git: text(location.git),
    },
    development,
    hosted,
    metadata: normalizeMetadata(raw, { git: text(location.git) }, hosted),
    environmentValues: normalizeArray(raw.environmentValues, normalizeEnvironmentValue).map(normalizeEnvValueForStorage),
    commands: normalizeArray(raw.commands, normalizeCommand).map((item) => ({ ...item, id: item.id || randomUUID() })),
    highlights: normalizeArray(raw.highlights, normalizeHighlight).map((item) => ({ ...item, id: item.id || randomUUID() })),
  };
}

function sanitizeProject(project: ProjectDocument): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    stack: project.stack,
    location: project.location,
    development: project.development,
    hosted: project.hosted,
    metadata: project.metadata,
    environmentValues: project.environmentValues.map(sanitizeEnvironmentValue),
    commands: project.commands,
    highlights: project.highlights,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

async function getProjectsCollection() {
  const db = await getDb();
  const collection = db.collection<ProjectDocument>("projects");
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ updatedAt: -1 });
  // enforce unique project names at the database level
  try {
    await collection.createIndex({ name: 1 }, { unique: true, sparse: true });
  } catch {
    // ignore index creation errors (e.g., existing duplicates during development)
  }
  return collection;
}

export async function createProject(raw: unknown) {
  const input = normalizeProjectInput(raw);
  const timestamp = now();
  const collection = await getProjectsCollection();
  // ensure name uniqueness
  const existingByName = await collection.findOne({ name: input.name });
  if (existingByName) throw new Error("Project name must be unique.");
  const document: ProjectDocument = {
    id: randomUUID(),
    favorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };
  await collection.insertOne(document);
  return sanitizeProject(document);
}

export async function updateProject(id: string, raw: unknown) {
  const input = normalizeProjectInput(raw);
  const collection = await getProjectsCollection();
  const existing = await collection.findOne({ id });
  if (!existing) throw new Error("Project not found.");

  // ensure unique name when updating (no other project with same name)
  const conflict = await collection.findOne({ name: input.name, id: { $ne: id } as any });
  if (conflict) throw new Error("Project name must be unique.");

  const nextDocument: ProjectDocument = {
    ...existing,
    ...input,
    id,
    favorite: existing.favorite,
    createdAt: existing.createdAt,
    updatedAt: now(),
  };

  await collection.updateOne({ id }, { $set: nextDocument });
  return sanitizeProject(nextDocument);
}

export async function updateProjectFavorite(id: string, favorite: boolean) {
  const collection = await getProjectsCollection();
  const result = await collection.findOneAndUpdate(
    { id },
    { $set: { favorite, updatedAt: now() } },
    { returnDocument: "after" },
  );

  if (!result) throw new Error("Project not found.");
  return sanitizeProject(result);
}

export async function deleteProject(id: string) {
  const collection = await getProjectsCollection();
  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const collection = await getProjectsCollection();
  const project = await collection.findOne({ id });
  return project ? sanitizeProject(project) : null;
}

export async function listProjectCards(): Promise<ProjectCard[]> {
  const collection = await getProjectsCollection();
  const projects = await collection.find({}).sort({ favorite: -1, updatedAt: -1, name: 1 }).toArray();

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    stack: project.stack,
    localPath: project.location.local,
    gitUrl: project.location.git,
    frontendUrl: project.development.frontend.url,
    backendStoragePath: project.development?.backend?.storagePath || "",
    frontendStoragePath: project.development?.frontend?.storagePath || "",
    liveUrl: project.hosted.frontend.url,
    hostedFrontendUrl: project.hosted.frontend.url,
    hostedBackendUrl: project.hosted.backend.url,
    hostingProvider: project.metadata.hostingProvider,
    databaseProvider: project.metadata.databaseProvider,
    environmentValueCount: project.environmentValues.length,
    updatedAt: project.updatedAt,
  }));
}

export async function listProjectCardsByPort(port: string): Promise<ProjectCard[]> {
  const collection = await getProjectsCollection();
  const projects = await collection
    .find({
      $or: [
        { "development.backend.port": port },
        { "development.frontend.port": port },
        { "development.database.port": port },
      ],
    })
    .sort({ favorite: -1, updatedAt: -1, name: 1 })
    .toArray();

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    stack: project.stack,
    localPath: project.location.local,
    gitUrl: project.location.git,
    frontendUrl: project.development.frontend.url,
    backendStoragePath: project.development?.backend?.storagePath || "",
    frontendStoragePath: project.development?.frontend?.storagePath || "",
    liveUrl: project.hosted.frontend.url,
    hostedFrontendUrl: project.hosted.frontend.url,
    hostedBackendUrl: project.hosted.backend.url,
    hostingProvider: project.metadata.hostingProvider,
    databaseProvider: project.metadata.databaseProvider,
    environmentValueCount: project.environmentValues.length,
    updatedAt: project.updatedAt,
  }));
}

export async function listProjects(): Promise<Project[]> {
  const collection = await getProjectsCollection();
  const projects = await collection.find({}).sort({ favorite: -1, updatedAt: -1, name: 1 }).toArray();
  return projects.map(sanitizeProject);
}

export async function makeBackup(): Promise<DevVaultBackup> {
  return { version: 2, exportedAt: now(), projects: await listProjects() };
}

export async function restoreBackup(raw: unknown) {
  if (!isObject(raw) || !Array.isArray(raw.projects)) {
    throw new Error("Backup JSON must include a projects array.");
  }

  const projects: ProjectDocument[] = raw.projects.map((project) => {
    if (!isObject(project)) throw new Error("Invalid project in backup.");
    const input = normalizeProjectInput(project);
    return {
      id: text(project.id) || randomUUID(),
      favorite: false,
      createdAt: text(project.createdAt) || now(),
      updatedAt: text(project.updatedAt) || now(),
      ...input,
    };
  });

  const collection = await getProjectsCollection();
  await collection.deleteMany({});
  if (projects.length > 0) {
    await collection.insertMany(projects);
  }

  return { importedProjects: projects.length };
}

export async function revealEnvironmentValue(projectId: string, environmentValueId: string, password?: string) {
  const collection = await getProjectsCollection();
  const project = await collection.findOne({ id: projectId });
  if (!project) {
    throw new Error("Project not found.");
  }

  const value = project.environmentValues.find((item) => item.id === environmentValueId);
  if (!value) {
    throw new Error("Environment value not found.");
  }

  if (!value.encrypted) {
    return value.value;
  }

  if (value.encryptedValue) {
    return decryptSecret(value.encryptedValue, password);
  }

  if (value.hashedValue) {
    throw new Error("This value was stored with one-way hashing and cannot be revealed. Save it again to switch to reversible encryption.");
  }

  return "";
}

export function formatCredentialsForClipboard(project: Pick<Project, "name" | "environmentValues">) {
  if (project.environmentValues.length === 0) {
    return `${project.name}\nNo environment values saved.`;
  }

  const lines = [`${project.name} environment values`, ""];
  project.environmentValues.forEach((item) => {
    lines.push(item.key || "Value");
    lines.push(`Value: ${item.encrypted ? PROTECTED_SECRET_PLACEHOLDER : item.value}`);
    if (item.encrypted) lines.push("Encrypted: yes");
    lines.push("");
  });
  return lines.join("\n").trim();
}
