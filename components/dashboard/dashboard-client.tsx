"use client";

import * as React from "react";
import { Archive, FolderKanban, PauseCircle, Search, Sparkles, Menu } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProjectCard } from "@/components/project/project-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HostingProvider, ProjectCard as ProjectCardType, ProjectStatus } from "@/types/project";
import { HOSTING_PROVIDERS, PROJECT_STATUSES } from "@/types/project";

type DashboardClientProps = {
  initialProjects: ProjectCardType[];
};

function includesText(value: string, search: string) {
  if (!value) return false;
  return value.toLowerCase().includes(search.toLowerCase());
}

export function DashboardClient({ initialProjects }: DashboardClientProps) {
  const [projects, setProjects] = React.useState(initialProjects);
  const [portDialogOpen, setPortDialogOpen] = React.useState(false);
  const [portQuery, setPortQuery] = React.useState("");
  const [portResults, setPortResults] = React.useState<ProjectCardType[] | null>(null);
  const [portLoading, setPortLoading] = React.useState(false);
  const [portAvailability, setPortAvailability] = React.useState<{ available?: boolean; takenByProcess?: string; takenByPid?: number; takenByProject?: { id: string; name: string } } | null>(null);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  // debounce typing before applying filter
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 1000);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [status, setStatus] = React.useState<ProjectStatus | "all">("all");
  const [provider, setProvider] = React.useState<HostingProvider | "all">("all");
  const hasActiveFilters = Boolean(search.trim()) || status !== "all" || provider !== "all";

  const filteredProjects = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        !normalizedSearch ||
        [project.name, project.description, project.frontendUrl, project.liveUrl, project.hostingProvider, project.gitUrl, project.localPath, ...project.stack]
          .some((value) => includesText(value, normalizedSearch));

      const matchesStatus = status === "all" || project.status === status;
      const matchesProvider = provider === "all" || project.hostingProvider === provider;
      return matchesSearch && matchesStatus && matchesProvider;
    });
  }, [projects, provider, search, status]);

  async function searchByPort() {
    if (!portQuery.trim()) return setPortResults([]);
    setPortLoading(true);
    try {
      const res = await fetch(`/api/projects/port?port=${encodeURIComponent(portQuery.trim())}`);
      const json = await res.json();
      setPortResults(Array.isArray(json.projects) ? json.projects : []);
      setPortAvailability({ available: json.available, takenByProcess: json.takenByProcess, takenByPid: json.takenByPid, takenByProject: json.takenByProject });
    } catch (e) {
      setPortResults([]);
    } finally {
      setPortLoading(false);
    }
  }

  const recentProjects = React.useMemo(() => {
    return [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);
  }, [projects]);

  function handleDeleted(id: string) {
    setProjects((current) => current.filter((project) => project.id !== id));
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{projects.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{projects.filter((project) => project.status === "active").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused / archived</CardTitle>
            <PauseCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{projects.filter((project) => project.status !== "active").length}</div></CardContent>
        </Card>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[auto_1fr_180px_220px]">
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setPortDialogOpen(true)}>Port checker</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={portDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Port checker</DialogTitle>
                  <DialogDescription>Search projects by development port (backend/frontend/database).</DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex gap-2">
                  <Input value={portQuery} onChange={(e) => setPortQuery(e.target.value)} placeholder="Enter port (e.g. 5000)" />
                  <Button onClick={searchByPort} disabled={portLoading}>{portLoading ? "Searching..." : "Search"}</Button>
                </div>
                <div className="mt-4">
                  {portResults === null ? null : (
                    <div>
                      {portAvailability ? (
                        <div className="mb-3 text-sm">
                          {portAvailability.available ? (
                            <div className="text-green-600">Port appears available.</div>
                          ) : portAvailability.takenByProject ? (
                            <div className="text-destructive">This port is already taken by {portAvailability.takenByProject.name} project.</div>
                          ) : portAvailability.takenByProcess ? (
                            <div className="text-muted-foreground">Port is in use by process: {portAvailability.takenByProcess} (PID {portAvailability.takenByPid}).</div>
                          ) : (
                            <div className="text-muted-foreground">Port is in use.</div>
                          )}
                        </div>
                      ) : null}

                      {portResults.length === 0 ? <div>No projects found for that port.</div> : (
                        <div className="grid gap-4 md:grid-cols-2">
                          {portResults.map((p) => <ProjectCard key={p.id} project={p} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={() => { setPortDialogOpen(false); setPortResults(null); setPortQuery(""); }}>Close</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search projects, URLs, paths, stack..." className="pl-9" />
          </label>
          <Select value={status} onValueChange={(value) => setStatus(value as ProjectStatus | "all")}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PROJECT_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={(value) => setProvider(value as HostingProvider | "all")}>
            <SelectTrigger><SelectValue placeholder="Hosting provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              {HOSTING_PROVIDERS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      {!hasActiveFilters && recentProjects.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Recent projects</h2>
              <p className="text-sm text-muted-foreground">Most recently updated records.</p>
            </div>
            <Badge variant="outline">{recentProjects.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentProjects.map((project) => <ProjectCard key={`recent-${project.id}`} project={project} onDeleted={handleDeleted} />)}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">All projects</h2>
            <p className="text-sm text-muted-foreground">Projects using the reduced schema.</p>
          </div>
          <Badge variant="outline">{filteredProjects.length}</Badge>
        </div>
        {filteredProjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => <ProjectCard key={project.id} project={project} onDeleted={handleDeleted} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-card p-10 text-center">
            <Archive className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No projects match these filters</h3>
          </div>
        )}
      </section>
    </div>
  );
}
