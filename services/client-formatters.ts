import type { Project } from "@/types/project";

export function formatCredentialsForClipboard(project: Pick<Project, "name" | "environmentValues">) {
  if (project.environmentValues.length === 0) {
    return `${project.name}\nNo environment values saved.`;
  }

  const lines = [`${project.name} environment values`, ""];
  project.environmentValues.forEach((item) => {
    lines.push(item.key || "Value");
    lines.push(`Value: ${item.encrypted ? "[encrypted secret]" : item.value}`);
    if (item.encrypted) lines.push("Encrypted: yes");
    lines.push("");
  });
  return lines.join("\n").trim();
}
