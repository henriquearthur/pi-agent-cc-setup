import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { basename, relative } from "node:path";

/** A compact Claude Code-like footer: project/branch, active modes, context, model, and thinking. */
export default function claudeCodeStatusline(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsubscribe,
        invalidate() {},
        render(width: number): string[] {
          const branch = footerData.getGitBranch();
          const project = basename(ctx.cwd) || ctx.cwd;
          const location = branch ? `${project} • ${branch}` : project;
          const statuses = [...footerData.getExtensionStatuses().values()];

          let contextTokens = 0;
          for (const entry of ctx.sessionManager.getBranch()) {
            if (entry.type === "message" && entry.message.role === "assistant") {
              const message = entry.message as AssistantMessage;
              contextTokens = message.usage.totalTokens ?? contextTokens;
            }
          }
          const contextWindow = ctx.model?.contextWindow ?? 0;
          const context = contextWindow > 0
            ? `ctx ${Math.min(100, Math.round((contextTokens / contextWindow) * 100))}%`
            : "ctx --";
          const thinking = pi.getThinkingLevel();
          const model = ctx.model?.id ?? "no model";

          const left = theme.fg("muted", ` ${location} `);
          const modes = statuses.length > 0 ? ` ${statuses.join("  ")} ` : "";
          const right = theme.fg("dim", `${context}  ${model}  ${thinking} `);
          const separator = theme.fg("borderMuted", "│");
          const fixed = left + (modes ? separator + modes : "") + separator + right;

          if (visibleWidth(fixed) <= width) {
            const padding = " ".repeat(Math.max(1, width - visibleWidth(fixed)));
            return [left + (modes ? separator + modes : "") + padding + separator + right];
          }

          const compact = theme.fg("muted", ` ${relative(process.env.HOME ?? "", ctx.cwd) || project} `)
            + separator
            + theme.fg("dim", ` ${context} ${model} `);
          return [truncateToWidth(compact, width)];
        },
      };
    });
  });
}
