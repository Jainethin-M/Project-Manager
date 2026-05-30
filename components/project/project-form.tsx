"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { joinList, splitList } from "@/lib/utils";
import type { CommandItem, CommandType, EnvironmentValue, HighlightItem, HostingProvider, DatabaseProvider, Project, ProjectInput, ProjectStatus } from "@/types/project";
import { COMMAND_TYPES, HOSTING_PROVIDERS, PROJECT_STATUSES, DATABASE_PROVIDERS } from "@/types/project";

const emptyFormState: ProjectInput = {
  name: "",
  description: "",
  status: "active",
  stack: [],
  location: { local: "", git: "" },
  development: {
    backend: { port: "", url: "", storagePath: "" },
    frontend: { port: "", url: "", storagePath: "" },
    database: { port: "", url: "", storagePath: "" },
  },
  hosted: {
    backend: { url: "", provider: "None" },
    frontend: { url: "", provider: "None" },
    database: { url: "", provider: "None" },
  },
  metadata: {
    repositoryUrl: "",
    frontendRepositoryUrl: "",
    backendRepositoryUrl: "",
    hostingProvider: "None",
    databaseProvider: "None",
    hostingEnvironment: "",
    hostingDashboardUrl: "",
    databaseName: "",
    notes: "",
  },
  environmentValues: [],
  commands: [],
  highlights: [],
};

function toFormState(project?: Project | null): ProjectInput {
  if (!project) return emptyFormState;
  return {
    name: project.name,
    description: project.description,
    status: project.status,
    stack: project.stack,
    location: project.location,
    development: project.development,
    hosted: project.hosted,
    metadata: project.metadata,
    environmentValues: project.environmentValues.map((item) => (item.encrypted ? { ...item, value: "", encryptedValue: item.encryptedValue, hashedValue: item.hashedValue } : item)),
    commands: project.commands,
    highlights: project.highlights,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EmptyArrayMessage({ label }: { label: string }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No {label} saved yet.</p>;
}

function parseEnvironmentBlock(input: string): EnvironmentValue[] {
  const parsed: Array<EnvironmentValue | null> = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
      const separatorIndex = normalized.indexOf("=");
      if (separatorIndex === -1) {
        return null;
      }

      const key = normalized.slice(0, separatorIndex).trim();
      let value = normalized.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!key) {
        return null;
      }

      return {
        key,
        value,
        encrypted: false,
      } satisfies EnvironmentValue;
    });

  return parsed.filter((item): item is EnvironmentValue => item !== null);
}

export function ProjectForm({ project, viewOnly = false }: { project?: Project | null; viewOnly?: boolean }) {
  const router = useRouter();
  const [form, setForm] = React.useState<ProjectInput>(() => toFormState(project));
  const [portSuggestions, setPortSuggestions] = React.useState<Record<string, Array<{ port: number; available: boolean; takenByProcess?: string; takenByProject?: { id: string; name: string } }>>>({});
  const [suggestLoading, setSuggestLoading] = React.useState<Record<string, boolean>>({});
  const [portWarnings, setPortWarnings] = React.useState<Record<string, string>>({});
  const [stackInput, setStackInput] = React.useState(() => joinList(toFormState(project).stack));
  const [envPasteInput, setEnvPasteInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const isEditing = Boolean(project?.id);
  const [nameWarning, setNameWarning] = React.useState("");
  const [portStatus, setPortStatus] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setStackInput(joinList(form.stack));
  }, [form.stack]);

  function updateField<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }


  // Debounced project name uniqueness check
  React.useEffect(() => {
    setNameWarning("");
    const name = form.name.trim();
    if (!name) return undefined;
    const id = project?.id;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects`);
        const json = await res.json();
        const projects = Array.isArray(json.projects) ? json.projects : json.projects || [];
        const conflict = projects.find((p: any) => p.name === name && p.id !== id);
        if (conflict) setNameWarning(`Project name is already used by ${conflict.name}.`);
      } catch {
        // ignore
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [form.name, project?.id]);

  // Debounced port availability checks for each area
  React.useEffect(() => {
    const timers: Array<NodeJS.Timeout> = [];
    (Object.keys(form.development) as Array<"frontend" | "backend" | "database">).forEach((area) => {
      const port = form.development[area].port?.trim();
      if (!port) return;
      const t = setTimeout(async () => {
        try {
          const res = await fetch(`/api/projects/port?port=${encodeURIComponent(port)}`);
          const json = await res.json();
          if (json.available) {
            setPortStatus((s) => ({ ...s, [area]: `Port ${port} appears available.` }));
          } else if (json.takenByProject) {
            setPortStatus((s) => ({ ...s, [area]: `Taken by project ${json.takenByProject.name}.` }));
          } else if (json.takenByProcess) {
            setPortStatus((s) => ({ ...s, [area]: `Used by ${json.takenByProcess} (PID ${json.takenByPid}).` }));
          } else {
            setPortStatus((s) => ({ ...s, [area]: `Port ${port} is in use.` }));
          }
        } catch {
          setPortStatus((s) => ({ ...s, [area]: "Unable to check port." }));
        }
      }, 1000);
      timers.push(t);
    });

    return () => timers.forEach((t) => clearTimeout(t));
  }, [form.development.frontend.port, form.development.backend.port, form.development.database.port]);

  function updateLocation(key: "local" | "git", value: string) {
    setForm((current) => ({ ...current, location: { ...current.location, [key]: value } }));
  }

  function updateDevelopment(area: "backend" | "frontend" | "database", key: "port" | "storagePath", value: string) {
    setForm((current) => ({
      ...current,
      development: {
        ...current.development,
        [area]: { ...current.development[area], [key]: value },
      },
    }));
  }

  async function suggestPorts(area: "backend" | "frontend" | "database") {
    setSuggestLoading((s) => ({ ...s, [area]: true }));
    try {
      const res = await fetch(`/api/projects/port?suggest=true&area=${area}`);
      const json = await res.json();
      setPortSuggestions((s) => ({ ...s, [area]: Array.isArray(json.suggestions) ? json.suggestions : [] }));
    } catch {
      setPortSuggestions((s) => ({ ...s, [area]: [] }));
    } finally {
      setSuggestLoading((s) => ({ ...s, [area]: false }));
    }
  }

  async function validatePort(area: "backend" | "frontend" | "database", portValue: string) {
    setPortWarnings((w) => ({ ...w, [area]: "" }));
    const port = portValue.trim();
    if (!port) return;
    try {
      const res = await fetch(`/api/projects/port?port=${encodeURIComponent(port)}`);
      const json = await res.json();
      const projects = Array.isArray(json.projects) ? json.projects : [];
      if (projects.length > 0) {
        // if editing, allow same project to keep the port
        const conflict = projects.find((p: any) => p.id !== project?.id);
        if (conflict) {
          setPortWarnings((w) => ({ ...w, [area]: `This port is already taken by ${conflict.name} project.` }));
        }
      }
    } catch {
      // ignore
    }
  }

  function updateHosted(area: "backend" | "frontend" | "database", key: "url" | "provider", value: string) {
    setForm((current) => ({
      ...current,
      hosted: {
        ...current.hosted,
        [area]: {
          ...current.hosted[area],
          [key]: (area === "database" ? (value as DatabaseProvider) : (value as HostingProvider)),
        },
      },
    }));
  }

  function updateMetadata<K extends keyof ProjectInput["metadata"]>(key: K, value: ProjectInput["metadata"][K]) {
    setForm((current) => ({ ...current, metadata: { ...current.metadata, [key]: value } }));
  }

  function updateEnvironmentValue(index: number, patch: Partial<EnvironmentValue>) {
    setForm((current) => ({
      ...current,
      environmentValues: current.environmentValues.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function updateCommand(index: number, patch: Partial<CommandItem>) {
    setForm((current) => ({
      ...current,
      commands: current.commands.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function updateHighlight(index: number, patch: Partial<HighlightItem>) {
    setForm((current) => ({
      ...current,
      highlights: current.highlights.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeArrayItem(key: "environmentValues" | "commands" | "highlights", index: number) {
    setForm((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }));
  }

  function handleEnvironmentPaste() {
    const parsedValues = parseEnvironmentBlock(envPasteInput);
    if (parsedValues.length === 0) {
      setError("No valid environment variables were found in the pasted text.");
      return;
    }

    setError("");
    updateField("environmentValues", parsedValues);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(isEditing ? `/api/projects/${project?.id}` : "/api/projects", {
        method: isEditing ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { project?: Project; error?: string };
      if (!response.ok || !result.project) throw new Error(result.error || "Unable to save project.");
      router.push(`/projects/${result.project.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button type="button" variant="ghost" size="sm" className="mb-3" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{isEditing ? `Edit ${project?.name}` : "New project"}</h1>
        </div>
        {!viewOnly ? (
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Project"}
          </Button>
        ) : null}
      </div>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
          <TabsTrigger value="hosted">Hosted</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
          <TabsTrigger value="highlights">Highlights</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic information</CardTitle>
              <CardDescription>Name, status, stack, and project locations.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Project Name">
                <Input value={form.name} onChange={(event) => !viewOnly && updateField("name", event.target.value)} required disabled={viewOnly} />
                {nameWarning ? <p className="mt-2 text-sm text-destructive">{nameWarning}</p> : null}
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(value) => !viewOnly && updateField("status", value as ProjectStatus)} disabled={viewOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Description">
                  <Textarea value={form.description} onChange={(event) => !viewOnly && updateField("description", event.target.value)} disabled={viewOnly} />
                </Field>
              </div>
              <Field label="Local path">
                <Input value={form.location.local} onChange={(event) => !viewOnly && updateLocation("local", event.target.value)} disabled={viewOnly} />
              </Field>
              <Field label="Git URL">
                <Input value={form.location.git} onChange={(event) => !viewOnly && updateLocation("git", event.target.value)} disabled={viewOnly} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Stack">
                  <Input
                    value={stackInput}
                    onChange={(event) => !viewOnly && setStackInput(event.target.value)}
                    onBlur={() => !viewOnly && updateField("stack", splitList(stackInput))}
                    placeholder="Next.js, MongoDB, Tailwind"
                    disabled={viewOnly}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="development">
          <Card>
            <CardHeader>
              <CardTitle>Development</CardTitle>
              <CardDescription>Local backend, frontend, and database port and storage details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {(["frontend", "backend", "database"] as const).map((area) => (
                <div key={area} className="space-y-4 rounded-xl border p-4">
                  <h3 className="font-semibold capitalize">{area}</h3>
                  <Field label="Port">
                    <div className="flex items-center gap-2">
                      <Input
                        value={form.development[area].port}
                        onChange={(event) => !viewOnly && updateDevelopment(area, "port", event.target.value)}
                        onBlur={() => !viewOnly && validatePort(area, form.development[area].port)}
                        disabled={viewOnly}
                      />
                      <Button size="sm" type="button" onClick={() => suggestPorts(area)} disabled={Boolean(suggestLoading[area]) || viewOnly}>
                        {suggestLoading[area] ? "Searching..." : "Suggest"}
                      </Button>
                    </div>
                    {portStatus[area] ? (
                      <p className="mt-2 text-sm text-muted-foreground">{portStatus[area]}</p>
                    ) : null}
                    {portWarnings[area] ? (
                      <p className="mt-2 text-sm text-destructive">{portWarnings[area]}</p>
                    ) : null}
                    {Array.isArray(portSuggestions[area]) && portSuggestions[area].length > 0 ? (
                      <div className="mt-2 grid gap-2">
                        {portSuggestions[area].slice(0, 8).map((s) => (
                          <div key={s.port} className="flex items-center justify-between rounded-md border p-2">
                            <div className="text-sm">
                              <div>Port {s.port}</div>
                              <div className="text-xs text-muted-foreground">
                                {s.available ? "Available" : s.takenByProject ? `Used by ${s.takenByProject.name}` : s.takenByProcess ? `Used by ${s.takenByProcess}` : "In use"}
                              </div>
                            </div>
                            <div>
                              <Button size="sm" type="button" onClick={() => !viewOnly && updateDevelopment(area, "port", String(s.port))} disabled={viewOnly}>
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Field>
                  <Field label="Storage path">
                    <Input value={form.development[area].storagePath} onChange={(event) => !viewOnly && updateDevelopment(area, "storagePath", event.target.value)} disabled={viewOnly} />
                  </Field>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hosted">
          <Card>
            <CardHeader>
              <CardTitle>Hosted</CardTitle>
              <CardDescription>Hosted backend, frontend, and database URLs and providers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {(["frontend", "backend", "database"] as const).map((area) => (
                <div key={area} className="space-y-4 rounded-xl border p-4">
                  <h3 className="font-semibold capitalize">{area}</h3>
                  <Field label="Provider">
                    <Select value={form.hosted[area].provider} onValueChange={(value) => updateHosted(area, "provider", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(area === "database" ? DATABASE_PROVIDERS : HOSTING_PROVIDERS).map((provider) => (
                          <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="URL">
                    <div className="flex items-center gap-2">
                      <Input value={form.hosted[area].url} onChange={(event) => updateHosted(area, "url", event.target.value)} />
                      <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(form.hosted[area].url || "")} aria-label={`Copy hosted ${area} URL`}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Environment values</CardTitle>
                <CardDescription>Paste a full `.env` file and let DevVault split it into key/value entries automatically.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={() => !viewOnly && updateField("environmentValues", [...form.environmentValues, { key: "", value: "", encrypted: false }])} disabled={viewOnly}>
                <Plus className="h-4 w-4" />
                Add Value
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-xl border p-4">
                <Field label="Paste environment file">
                  <Textarea
                    value={envPasteInput}
                    onChange={(event) => !viewOnly && setEnvPasteInput(event.target.value)}
                    placeholder={"dashboard=itsme\ncontent=jai\nmongoUIR=xyz"}
                    className="min-h-40 font-mono text-sm"
                    disabled={viewOnly}
                  />
                </Field>
                <div className="flex gap-3">
                  <Button type="button" onClick={handleEnvironmentPaste} disabled={viewOnly}>
                    Parse Env
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => !viewOnly && setEnvPasteInput("")} disabled={viewOnly}>
                    Clear
                  </Button>
                </div>
              </div>
              {form.environmentValues.length === 0 ? <EmptyArrayMessage label="environment values" /> : null}
              {form.environmentValues.map((item, index) => (
                <div key={index} className="grid gap-4 rounded-xl border p-4 md:grid-cols-3">
                  <Field label="Key">
                    <Input value={item.key} onChange={(event) => !viewOnly && updateEnvironmentValue(index, { key: event.target.value })} disabled={viewOnly} />
                  </Field>
                  <Field label="Value">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.value}
                        placeholder={item.encrypted && (item.encryptedValue || item.hashedValue) ? "Already encrypted. Enter a new value to rotate it." : ""}
                        onChange={(event) => !viewOnly && updateEnvironmentValue(index, { value: event.target.value })}
                        disabled={viewOnly}
                      />
                      <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(item.value || "")} aria-label={`Copy value ${index}`}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                    <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-current"
                      checked={Boolean(item.encrypted)}
                      onChange={(event) => !viewOnly && updateEnvironmentValue(index, { encrypted: event.target.checked })}
                      disabled={viewOnly}
                    />
                    Encrypted
                  </label>
                  <div className="md:col-span-3">
                    <Button type="button" variant="destructive" size="sm" onClick={() => !viewOnly && removeArrayItem("environmentValues", index)} disabled={viewOnly}>
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commands">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Commands</CardTitle>
                <CardDescription>Run, build, deploy, docker, test, or other commands.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={() => !viewOnly && updateField("commands", [...form.commands, { type: "other", title: "", command: "" }])} disabled={viewOnly}>
                <Plus className="h-4 w-4" />
                Add Command
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.commands.length === 0 ? <EmptyArrayMessage label="commands" /> : null}
              {form.commands.map((item, index) => (
                <div key={index} className="grid gap-4 rounded-xl border p-4 md:grid-cols-3">
                  <Field label="Type">
                    <Select value={item.type} onValueChange={(value) => updateCommand(index, { type: value as CommandType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMMAND_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Title">
                    <Input value={item.title} onChange={(event) => updateCommand(index, { title: event.target.value })} />
                  </Field>
                  <Field label="Command">
                    <Input value={item.command} onChange={(event) => updateCommand(index, { command: event.target.value })} />
                  </Field>
                  <div className="md:col-span-3">
                    <Button type="button" variant="destructive" size="sm" onClick={() => !viewOnly && removeArrayItem("commands", index)} disabled={viewOnly}>
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Highlights</CardTitle>
                <CardDescription>Notes and related links.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={() => !viewOnly && updateField("highlights", [...form.highlights, { notes: "", links: [] }])} disabled={viewOnly}>
                <Plus className="h-4 w-4" />
                Add Highlight
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.highlights.length === 0 ? <EmptyArrayMessage label="highlights" /> : null}
              {form.highlights.map((item, index) => (
                <div key={index} className="grid gap-4 rounded-xl border p-4">
                  <Field label="Notes">
                    <Textarea value={item.notes} onChange={(event) => updateHighlight(index, { notes: event.target.value })} />
                  </Field>
                  <Field label="Links">
                    <Input
                      value={joinList(item.links)}
                      onChange={(event) => updateHighlight(index, { links: splitList(event.target.value) })}
                      placeholder="https://example.com, https://docs.example.com"
                    />
                  </Field>
                  <Button type="button" variant="destructive" size="sm" className="w-fit" onClick={() => !viewOnly && removeArrayItem("highlights", index)} disabled={viewOnly}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
