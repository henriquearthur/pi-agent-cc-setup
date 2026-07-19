import { createBashTool, createReadTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text, truncateToWidth } from "@earendil-works/pi-tui";

function textContent(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n");
}

/** Keeps Bash results compact by default, with raw output available through Ctrl+O. */
export default function claudeCodeToolOutput(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    // Pi documents this as the supported way to start sessions with tool details collapsed.
    ctx.ui.setToolsExpanded(false);

    // Preserve Pi's built-in Bash behavior while changing only its TUI renderers.
    const bash = createBashTool(ctx.cwd);
    pi.registerTool({
      ...bash,
      // Avoid Pi's padded, coloured tool box; this makes the tool trace read inline.
      renderShell: "self",
      renderCall(args, theme) {
        const command = String(args.command ?? "").replace(/\s+/g, " ").trim();
        const preview = truncateToWidth(command, 88);
        return new Text(theme.fg("accent", "› ") + theme.fg("muted", `$ ${preview}`), 0, 0);
      },
      renderResult(result, { expanded }, theme, context) {
        const output = textContent(result);
        if (expanded) return new Text(theme.fg("toolOutput", output || "(no output)"), 0, 0);

        const lines = output ? output.split("\n").filter(Boolean).length : 0;
        const summary = lines > 0 ? `output hidden · ${lines} lines · Ctrl+O` : "done";
        const color = context.isError ? "error" : "dim";
        return new Text(theme.fg(color, `  ↳ ${summary}`), 0, 0);
      },
    });

    // Skills and loaded context are read through this same tool, so this also
    // replaces Pi's large [skill] and "read resource" cards with one-line traces.
    const read = createReadTool(ctx.cwd);
    pi.registerTool({
      ...read,
      renderShell: "self",
      renderCall(args, theme) {
        const path = truncateToWidth(String(args.path ?? ""), 88);
        return new Text(theme.fg("accent", "› ") + theme.fg("muted", `read ${path}`), 0, 0);
      },
      renderResult(result, { expanded }, theme, context) {
        const output = textContent(result);
        if (expanded) return new Text(theme.fg("toolOutput", output || "(empty file)"), 0, 0);

        const lines = output ? output.split("\n").length : 0;
        const color = context.isError ? "error" : "dim";
        return new Text(theme.fg(color, `  ↳ ${lines > 0 ? `${lines} lines hidden · Ctrl+O` : "done"}`), 0, 0);
      },
    });
  });
}
