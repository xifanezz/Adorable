"use client";
import { ReviewDecision } from "./review";
import type {
  AppConfig,
  ApplyPatchCommand,
  ApprovalPolicy,
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseItem,
} from "./types";

import { log, isLoggingEnabled } from "./log";
import { process_patch } from "./apply-patch";
import { fs } from "@/lib/fs";

// Timeout for rate limit retries
const RATE_LIMIT_RETRY_WAIT_MS = 2500;

export type CommandConfirmation = {
  review: ReviewDecision;
  applyPatch?: ApplyPatchCommand | undefined;
  customDenyMessage?: string;
};

const alreadyProcessedResponses = new Set();

type AgentLoopParams = {
  model: string;
  config?: AppConfig;
  instructions?: string;
  approvalPolicy: ApprovalPolicy;
  onItem: (item: ResponseItem) => void;
  onLoading: (loading: boolean) => void;

  /** Called when the command is not auto-approved to request explicit user review. */
  getCommandConfirmation: (
    command: Array<string>,
    applyPatch: ApplyPatchCommand | undefined,
  ) => Promise<CommandConfirmation>;
  onLastResponseId: (lastResponseId: string) => void;
};

export class AgentLoop {
  private model: string;
  private instructions?: string;
  private approvalPolicy: ApprovalPolicy;
  private config: AppConfig;

  /**
   * A reference to the currently active stream returned from the OpenAI
   * client. We keep this so that we can abort the request if the user decides
   * to interrupt the current task (e.g. via the escape hot‑key).
   */
  private currentStream: unknown | null = null;

  /** Incremented with every call to `run()`. Allows us to ignore stray events
   * from streams that belong to a previous run which might still be emitting
   * after the user has canceled and issued a new command. */
  private generation = 0;

  /** AbortController for in‑progress tool calls (e.g. apply patch commands). */
  private execAbortController: AbortController | null = null;

  /** Set to true when `cancel()` is called so `run()` can exit early. */
  private canceled = false;

  /** Function calls that were emitted by the model but never answered because
   *  the user cancelled the run.  We keep the `call_id`s around so the *next*
   *  request can send a dummy `function_call_output` that satisfies the
   *  contract and prevents the
   *    400 | No tool output found for function call …
   *  error from OpenAI. */
  private pendingAborts: Set<string> = new Set();

  /** Set to true by `terminate()` – prevents any further use of the instance. */
  private terminated = false;

  /** Master abort controller – fires when terminate() is invoked. */
  private readonly hardAbort = new AbortController();

  private onItem: (item: ResponseItem) => void;
  private onLoading: (loading: boolean) => void;
  private getCommandConfirmation: (
    command: Array<string>,
    applyPatch: ApplyPatchCommand | undefined,
  ) => Promise<CommandConfirmation>;
  private onLastResponseId: (lastResponseId: string) => void;

  /**
   * Abort the ongoing request/stream, if any. This allows callers (typically
   * the UI layer) to interrupt the current agent step so the user can issue
   * new instructions without waiting for the model to finish.
   */
  public cancel(): void {
    if (this.terminated) {
      return;
    }
    if (isLoggingEnabled()) {
      log(
        `AgentLoop.cancel() invoked – currentStream=${Boolean(
          this.currentStream,
        )} execAbortController=${Boolean(
          this.execAbortController,
        )} generation=${this.generation}`,
      );
    }
    (
      this.currentStream as { controller?: { abort?: () => void } } | null
    )?.controller?.abort?.();

    this.canceled = true;
    this.execAbortController?.abort();
    if (isLoggingEnabled()) {
      log("AgentLoop.cancel(): execAbortController.abort() called");
    }

    // If we have *not* seen any function_call IDs yet there is nothing that
    // needs to be satisfied in a follow‑up request.  In that case we clear
    // the stored lastResponseId so a subsequent run starts a clean turn.
    if (this.pendingAborts.size === 0) {
      try {
        this.onLastResponseId("");
      } catch {
        /* ignore */
      }
    }

    // NOTE: We intentionally do *not* clear `lastResponseId` here.  If the
    // stream produced a `function_call` before the user cancelled, OpenAI now
    // expects a corresponding `function_call_output` that must reference that
    // very same response ID.  We therefore keep the ID around so the
    // follow‑up request can still satisfy the contract.
    this.onLoading(false);

    this.generation += 1;
    if (isLoggingEnabled()) {
      log(`AgentLoop.cancel(): generation bumped to ${this.generation}`);
    }
  }

  /**
   * Hard‑stop the agent loop. After calling this method the instance becomes
   * unusable: any in‑flight operations are aborted and subsequent invocations
   * of `run()` will throw.
   */
  public terminate(): void {
    if (this.terminated) {
      return;
    }
    this.terminated = true;

    this.hardAbort.abort();

    this.cancel();
  }

  public sessionId: string;

  constructor({
    model,
    instructions,
    approvalPolicy,
    config,
    onItem,
    onLoading,
    getCommandConfirmation,
    onLastResponseId,
  }: AgentLoopParams & { config?: AppConfig }) {
    this.model = model;
    this.instructions = instructions;
    this.approvalPolicy = approvalPolicy;

    // If no `config` has been provided we derive a minimal stub
    this.config =
      config ??
      ({
        model,
        instructions: instructions ?? "",
      } as AppConfig);
    this.onItem = onItem;
    this.onLoading = onLoading;
    this.getCommandConfirmation = getCommandConfirmation;
    this.onLastResponseId = onLastResponseId;
    this.sessionId = crypto.randomUUID().replace(/-/g, "");

    this.hardAbort = new AbortController();

    this.hardAbort.signal.addEventListener(
      "abort",
      () => this.execAbortController?.abort(),
      { once: true },
    );
  }

  /**
   * Process apply patch command with user confirmation
   */
  private async handleApplyPatch(
    command: Array<string>,
    patchText: string,
  ): Promise<{
    outputText: string;
    metadata: { exit_code: number; duration_seconds: number };
    additionalItems?: Array<ResponseInputItem>;
  }> {
    // Ask for user confirmation
    const { review: decision, customDenyMessage } =
      await this.getCommandConfirmation(command, { patch: patchText });

    // Any decision other than an affirmative (YES / ALWAYS) aborts execution.
    if (decision !== ReviewDecision.YES && decision !== ReviewDecision.ALWAYS) {
      const note =
        decision === ReviewDecision.NO_CONTINUE
          ? customDenyMessage?.trim() ||
            "No, don't do that — keep going though."
          : "No, don't do that — stop for now.";
      return {
        outputText: "aborted",
        metadata: { exit_code: 1, duration_seconds: 0 },
        additionalItems: [
          {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: note }],
          },
        ],
      };
    }

    // Process the patch
    try {
      const start = Date.now();

      const result = await process_patch(
        patchText,
        (p) => fs.promises.readFile(p, "utf8").then((c) => c.toString()),
        (p, c) => fs.promises.writeFile(p, c, "utf8"),
        (p) => fs.promises.unlink(p),
      );

      const duration = Date.now() - start;

      return {
        outputText: result,
        metadata: {
          exit_code: 0,
          duration_seconds: Math.round(duration / 100) / 10,
        },
      };
    } catch (error: unknown) {
      const stderr = String((error as Error).message ?? error);
      return {
        outputText: stderr,
        metadata: { exit_code: 1, duration_seconds: 0 },
      };
    }
  }

  private async handleFunctionCall(
    item: ResponseFunctionToolCall,
  ): Promise<Array<ResponseInputItem>> {
    // If the agent has been canceled in the meantime we should not perform any
    // additional work. Returning an empty array ensures that we neither execute
    // the requested tool call nor enqueue any follow‑up input items. This keeps
    // the cancellation semantics intuitive for users – once they interrupt a
    // task no further actions related to that task should be taken.
    if (this.canceled) {
      return [];
    }

    // For simplicity, extract the name and arguments directly
    const name = item.arguments ? JSON.parse(item.arguments).name : undefined;
    const rawArguments = item.arguments;
    const callId = item.call_id || item.id;

    // Parse arguments - for this simplified version, we'll just use JSON.parse
    let args;
    try {
      args = rawArguments ? JSON.parse(rawArguments) : {};
    } catch (e) {
      console.error("Failed to parse function call arguments:", e);
      return [
        {
          type: "function_call_output",
          call_id: callId,
          output: `invalid arguments: ${rawArguments}`,
        },
      ];
    }

    const outputItem: ResponseInputItem = {
      type: "function_call_output",
      call_id: callId,
      output: "no function found",
    };

    // used to tell model to stop if needed
    const additionalItems: Array<ResponseInputItem> = [];

    // We only support apply_patch commands now
    if ((name === "container.exec" || name === "shell") && args.cmd) {
      try {
        // Check if this is an apply_patch command
        if (args.cmd[0] === "apply_patch" && args.cmd.length === 2) {
          const patchText = args.cmd[1];
          const {
            outputText,
            metadata,
            additionalItems: additionalItemsFromExec,
          } = await this.handleApplyPatch(args.cmd, patchText);

          outputItem.output = JSON.stringify({ output: outputText, metadata });

          if (additionalItemsFromExec) {
            additionalItems.push(...additionalItemsFromExec);
          }
        } else {
          // Unsupported command
          outputItem.output = JSON.stringify({
            output: "Only apply_patch commands are supported.",
            metadata: { exit_code: 1, duration_seconds: 0 },
          });
        }
      } catch (error) {
        outputItem.output = JSON.stringify({
          output: `Error executing command: ${error}`,
          metadata: { exit_code: 1, duration_seconds: 0 },
        });
      }
    }

    return [outputItem, ...additionalItems];
  }

  public async run(
    input: Array<ResponseInputItem>,
    previousResponseId: string = "",
  ): Promise<void> {
    // This is a simplified implementation that doesn't make actual API calls
    // In a real implementation, this would connect to an LLM API

    if (this.terminated) {
      throw new Error("AgentLoop has been terminated");
    }

    // Reset cancellation flag for a fresh run
    this.canceled = false;

    // Create a fresh AbortController for this run
    this.execAbortController = new AbortController();

    if (isLoggingEnabled()) {
      log(
        `AgentLoop.run(): with ${input.length} input items. This is a simplified implementation without actual API calls.`,
      );
    }

    // In this simplified implementation, we'll mock the handling of tool calls
    // by processing any function_call items in the input
    for (const item of input) {
      if (item.type === "function_call" && !this.canceled) {
        const functionCallItem = item as unknown as ResponseFunctionToolCall;
        const result = await this.handleFunctionCall(functionCallItem);

        // Process results
        for (const resultItem of result) {
          if (!this.canceled) {
            this.onItem(resultItem as ResponseItem);
          }
        }
      } else {
        // For non-function call items, just pass them through
        if (!this.canceled) {
          this.onItem(item as ResponseItem);
        }
      }
    }

    // Set a mock response ID
    const mockResponseId = `mock-response-${Date.now()}`;
    this.onLastResponseId(mockResponseId);

    // Signal that we're done loading
    this.onLoading(false);

    if (isLoggingEnabled()) {
      log(`AgentLoop.run(): completed mock execution`);
    }
  }
}

