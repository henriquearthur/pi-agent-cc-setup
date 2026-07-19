import { basename } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

/** Shows one Claude Code-like line above the editor while quietStartup suppresses Pi's inventory. */
export default function claudeCodeHeader(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    const project = basename(ctx.cwd) || ctx.cwd;
    ctx.ui.setWidget("claude-code-welcome", (_tui, theme) => ({
      render(width: number): string[] {
        const line = theme.fg("accent", "✦ ")
          + theme.bold("Pi")
          + theme.fg("muted", `  ${project}  ·  / commands  ·  Ctrl+Alt+P plan`);
        return [truncateToWidth(line, width)];
      },
      invalidate() {},
    }));
  });
}
