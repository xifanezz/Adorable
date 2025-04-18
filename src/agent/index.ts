// Export the main agent loop and types
export { AgentLoop, type CommandConfirmation } from "./agent-loop";
export { ReviewDecision } from "./review";

// Export utility functions
export { log, isLoggingEnabled } from "./log";

// Export patch utilities
export {
  process_patch,
  identify_files_needed,
  identify_files_added,
} from "./apply-patch";

// Export types
export {
  ApprovalPolicy,
  FullAutoErrorMode,
  type AppConfig,
  type ApplyPatchCommand,
  type ResponseItem,
  type ResponseInputItem,
  type ResponseFunctionToolCall,
} from "./types";

// Export parse-apply-patch utilities
export {
  parseApplyPatch,
  type ApplyPatchOp,
  type ApplyPatchCreateFileOp,
  type ApplyPatchDeleteFileOp,
  type ApplyPatchUpdateFileOp,
} from "./parse-apply-patch";
