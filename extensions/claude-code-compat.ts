import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function markdownFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

/** Enables Claude Code's optional .claude/skills and .claude/rules conventions in trusted projects. */
export default function claudeCodeCompat(pi: ExtensionAPI): void {
  let rules: string[] = [];

  pi.on("resources_discover", (event, ctx) => {
    if (!ctx.isProjectTrusted()) return;
    const skills = join(event.cwd, ".claude", "skills");
    return existsSync(skills) ? { skillPaths: [skills] } : undefined;
  });

  pi.on("session_start", (_event, ctx) => {
    rules = [];
    if (!ctx.isProjectTrusted()) return;
    const root = join(ctx.cwd, ".claude", "rules");
    rules = markdownFiles(root).map((file) => relative(ctx.cwd, file));
    if (rules.length > 0) ctx.ui.notify(`Loaded ${rules.length} Claude rule file(s).`, "info");
  });

  pi.on("before_agent_start", (event) => {
    if (rules.length === 0) return;
    return {
      systemPrompt: `${event.systemPrompt}\n\n## Claude project rules\nRelevant rules are available below. Read the specific file before applying it:\n${rules.map((file) => `- ${file}`).join("\n")}`,
    };
  });
}
