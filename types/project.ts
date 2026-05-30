export type ProjectStatus = "active" | "paused" | "archived";
export type CommandType = "run" | "build" | "deploy" | "docker" | "test" | "other";
export type HostingProvider = "Render" | "Vercel" | "Netlify" | "GitHub Pages" | "Railway" | "AWS" | "Azure" | "GCP" | "Other" | "None";
export type DatabaseProvider = "None" | "MongoDB" | "Supabase" | "Oracle" | "Postgres" | "Firebase" | "MySQL" | "Redis" | "Other";

export type ProjectLocation = {
  local: string;
  git: string;
};

export type DevelopmentService = {
  port: string;
  url: string;
  storagePath: string;
};

export type DevelopmentEnvironment = {
  backend: DevelopmentService;
  frontend: DevelopmentService;
  database: DevelopmentService;
};

export type HostedService = {
  url: string;
  provider: HostingProvider;
};

export type HostedEnvironment = {
  backend: HostedService;
  frontend: HostedService;
  database: { url: string; provider: DatabaseProvider };
};

export type ProjectMetadata = {
  repositoryUrl: string;
  frontendRepositoryUrl: string;
  backendRepositoryUrl: string;
  hostingProvider: HostingProvider;
  databaseProvider: DatabaseProvider;
  hostingEnvironment: string;
  hostingDashboardUrl: string;
  databaseName: string;
  notes: string;
};

export type EnvironmentValue = {
  id?: string;
  key: string;
  value: string;
  encrypted?: boolean;
  hashedValue?: string;
  encryptedValue?: string;
};

export type CommandItem = {
  id?: string;
  type: CommandType;
  title: string;
  command: string;
};

export type HighlightItem = {
  id?: string;
  notes: string;
  links: string[];
};

export type ProjectInput = {
  name: string;
  description: string;
  status: ProjectStatus;
  stack: string[];
  location: ProjectLocation;
  development: DevelopmentEnvironment;
  hosted: HostedEnvironment;
  metadata: ProjectMetadata;
  environmentValues: EnvironmentValue[];
  commands: CommandItem[];
  highlights: HighlightItem[];
};

export type Project = ProjectInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectCard = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  stack: string[];
  localPath: string;
  gitUrl: string;
  frontendUrl: string;
  liveUrl: string;
  hostedFrontendUrl: string;
  hostedBackendUrl: string;
  hostingProvider: HostingProvider;
  databaseProvider: DatabaseProvider;
  environmentValueCount: number;
  updatedAt: string;
  backendStoragePath?: string;
  frontendStoragePath?: string;
};

export type DevVaultBackup = {
  version: 2;
  exportedAt: string;
  projects: Project[];
};

export const PROJECT_STATUSES: ProjectStatus[] = ["active", "paused", "archived"];
export const HOSTING_PROVIDERS: HostingProvider[] = ["None", "Render", "Vercel", "Netlify", "GitHub Pages", "Railway", "AWS", "Azure", "GCP", "Other"];
export const DATABASE_PROVIDERS: DatabaseProvider[] = ["None", "MongoDB", "Supabase", "Oracle", "Postgres", "Firebase", "MySQL", "Redis", "Other"];
export const COMMAND_TYPES: CommandType[] = ["run", "build", "deploy", "docker", "test", "other"];
