// Define common types used throughout the agent system

// Type for approval policies
export enum ApprovalPolicy {
  SUGGEST = "suggest",
  AUTO_EDIT = "auto-edit",
  FULL_AUTO = "full-auto",
}

// Type for error handling modes in full auto mode
export enum FullAutoErrorMode {
  ASK_USER = "ask-user",
  IGNORE_AND_CONTINUE = "ignore-and-continue",
}

// Type for application configuration
export type AppConfig = {
  apiKey?: string;
  model: string;
  instructions: string;
  fullAutoErrorMode?: FullAutoErrorMode;
  memory?: {
    enabled: boolean;
  };
};

// Type for apply patch command
export type ApplyPatchCommand = {
  patch: string;
};

// Types for response items - mimicking OpenAI types
export interface ResponseItem {
  id: string;
  type: string;
  role?: string;
  content?: Array<{ type: string; text: string }>;
}

export interface ResponseInputItem {
  type: string;
  role?: string;
  content?: Array<{ type: string; text: string }>;
  call_id?: string;
  output?: string;
}

export interface ResponseFunctionToolCall {
  id: string;
  type: string;
  call_id: string;
  arguments: string;
}

