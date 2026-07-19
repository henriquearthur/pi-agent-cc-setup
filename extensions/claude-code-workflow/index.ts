import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { AssistantMessage, TextContent } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

type Todo = { step: number; text: string; done: boolean };
type WorkflowState = { mode: "plan" | "execute" | "normal"; todos: Todo[]; toolsBeforePlan?: string[] };

const WRITE_TOOLS = new Set(["edit", "write"]);
const SAFE_BASH = /^(?:pwd|ls(?:\s|$)|find(?:\s|$)|rg(?:\s|$)|grep(?:\s|$)|cat(?:\s|$)|head(?:\s|$)|tail(?:\s|$)|sed\s+-n\b|git\s+(?:status|diff|log|show|branch|ls-files|grep)\b)/;

function assistantText(message: AgentMessage): string | undefined {
  if (message.role !== "assistant" || !Array.isArray(message.content)) return;
  return message.content
    .filter((part): part is TextContent => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function parsePlan(text: string): Todo[] {
  const planStart = text.search(/^\s*plan\s*:\s*$/im);
  const source = planStart >= 0 ? text.slice(planStart) : text;
  const todos: Todo[] = [];
  for (const line of source.split("\n")) {
    const match = line.match(/^\s*(\d+)[.)]\s+(.+?)\s*$/);
    if (match) todos.push({ step: Number(match[1]), text: match[2], done: false });
  }
  return todos;
}

function isReadOnlyCommand(command: string): boolean {
  const trimmed = command.trim();
  return Boolean(trimmed) && !/[;&|><`$()]/.test(trimmed) && SAFE_BASH.test(trimmed);
}

export default function claudeCodeWorkflow(pi: ExtensionAPI): void {
  let state: WorkflowState = { mode: "normal", todos: [] };

  const save = () => pi.appendEntry("claude-code-workflow", state);
  const refresh = (ctx: ExtensionContext) => {
    if (state.mode === "plan") {
      ctx.ui.setStatus("claude-workflow", ctx.ui.theme.fg("warning", "⏸ plan"));
    } else if (state.mode === "execute" && state.todos.length > 0) {
      const done = state.todos.filter((todo) => todo.done).length;
      ctx.ui.setStatus("claude-workflow", ctx.ui.theme.fg("accent", `☐ ${done}/${state.todos.length}`));
    } else {
      ctx.ui.setStatus("claude-workflow", undefined);
    }

    if (state.todos.length > 0 && state.mode !== "normal") {
      ctx.ui.setWidget(
        "claude-workflow-todos",
        state.todos.map((todo) =>
          todo.done
            ? ctx.ui.theme.fg("success", "✓ ") + ctx.ui.theme.fg("muted", ctx.ui.theme.strikethrough(todo.text))
            : ctx.ui.theme.fg("dim", "○ ") + todo.text,
        ),
      );
    } else {
      ctx.ui.setWidget("claude-workflow-todos", undefined);
    }
  };

  const enablePlan = (ctx: ExtensionContext) => {
    if (state.mode === "plan") return;
    state.toolsBeforePlan ??= pi.getActiveTools();
    pi.setActiveTools(pi.getActiveTools().filter((name) => !WRITE_TOOLS.has(name)));
    state.mode = "plan";
    state.todos = [];
    save();
    refresh(ctx);
    ctx.ui.notify("Plan mode enabled: file writes and non-read-only shell commands are blocked.", "info");
  };

  const disablePlan = (ctx: ExtensionContext) => {
    if (state.mode === "plan") pi.setActiveTools(state.toolsBeforePlan ?? pi.getActiveTools());
    state.mode = "normal";
    state.todos = [];
    state.toolsBeforePlan = undefined;
    save();
    refresh(ctx);
  };

  pi.registerCommand("plan", {
    description: "Toggle read-only planning mode; use /plan off to leave it",
    handler: async (args, ctx) => {
      if (args.trim().toLowerCase() === "off") disablePlan(ctx);
      else if (state.mode === "plan") disablePlan(ctx);
      else enablePlan(ctx);
    },
  });

  pi.registerCommand("todos", {
    description: "Show progress for the current saved plan",
    handler: async (_args, ctx) => {
      if (state.todos.length === 0) return ctx.ui.notify("No saved plan. Use /plan and ask for a numbered Plan: first.", "info");
      const text = state.todos.map((todo) => `${todo.step}. ${todo.done ? "✓" : "○"} ${todo.text}`).join("\n");
      ctx.ui.notify(text, "info");
    },
  });

  pi.registerCommand("execute", {
    description: "Leave plan mode and execute the saved plan with progress tracking",
    handler: async (_args, ctx) => {
      if (state.todos.length === 0) return ctx.ui.notify("No saved plan to execute.", "warning");
      if (state.mode === "plan") pi.setActiveTools(state.toolsBeforePlan ?? pi.getActiveTools());
      state.mode = "execute";
      state.toolsBeforePlan = undefined;
      save();
      refresh(ctx);
      pi.sendUserMessage(`Execute this approved plan in order:\n${state.todos.map((todo) => `${todo.step}. ${todo.text}`).join("\n")}\nAfter each completed step, include [DONE:<step number>] in your response.`);
    },
  });

  pi.registerShortcut(Key.ctrlAlt("p"), {
    description: "Toggle read-only plan mode",
    handler: async (ctx) => state.mode === "plan" ? disablePlan(ctx) : enablePlan(ctx),
  });

  pi.on("tool_call", (event) => {
    if (state.mode !== "plan") return;
    if (WRITE_TOOLS.has(event.toolName)) return { block: true, reason: "Plan mode is read-only. Use /plan off to enable writes." };
    if (event.toolName === "bash" && !isReadOnlyCommand(String(event.input.command ?? ""))) {
      return { block: true, reason: "Plan mode allows only simple read-only shell commands. Use /plan off to run this command." };
    }
  });

  pi.on("user_bash", (event) => {
    if (state.mode === "plan" && !isReadOnlyCommand(event.command)) {
      return { result: { output: "Plan mode blocked a non-read-only shell command. Use /plan off to run it.", exitCode: 1, cancelled: false, truncated: false } };
    }
  });

  pi.on("before_agent_start", () => {
    if (state.mode === "plan") {
      return { message: { customType: "claude-plan-context", display: false, content: "[PLAN MODE]\nExplore only. Do not modify files. Use read-only tools and simple inspection commands. End your response with a detailed numbered section headed exactly `Plan:`. Do not claim implementation is complete." } };
    }
    if (state.mode === "execute" && state.todos.length > 0) {
      const remaining = state.todos.filter((todo) => !todo.done).map((todo) => `${todo.step}. ${todo.text}`).join("\n");
      return { message: { customType: "claude-execute-context", display: false, content: `[PLAN EXECUTION]\nRemaining approved steps:\n${remaining}\nMark completed steps with [DONE:<step number>] in each response.` } };
    }
  });

  pi.on("turn_end", (event, ctx) => {
    const text = assistantText(event.message);
    if (!text) return;
    if (state.mode === "plan") {
      const todos = parsePlan(text);
      if (todos.length > 0) {
        state.todos = todos;
        save();
        refresh(ctx);
      }
    }
    if (state.mode === "execute") {
      for (const match of text.matchAll(/\[DONE:(\d+)\]/g)) {
        const todo = state.todos.find((item) => item.step === Number(match[1]));
        if (todo) todo.done = true;
      }
      if (state.todos.every((todo) => todo.done)) state.mode = "normal";
      save();
      refresh(ctx);
    }
  });

  pi.on("session_start", (_event, ctx) => {
    const entry = ctx.sessionManager.getEntries()
      .filter((item: { type: string; customType?: string }) => item.type === "custom" && item.customType === "claude-code-workflow")
      .pop() as { data?: WorkflowState } | undefined;
    if (entry?.data) state = entry.data;
    if (state.mode === "plan") {
      state.toolsBeforePlan ??= pi.getActiveTools();
      pi.setActiveTools(pi.getActiveTools().filter((name) => !WRITE_TOOLS.has(name)));
    }
    refresh(ctx);
  });
}
