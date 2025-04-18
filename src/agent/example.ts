// This is a simple example of how to use the agent system

import {
  AgentLoop,
  ApprovalPolicy,
  ReviewDecision,
  type CommandConfirmation,
} from "./index.js";

// Example function that would handle user confirmation
async function getCommandConfirmation(
  command: Array<string>,
  applyPatch: any | undefined,
): Promise<CommandConfirmation> {
  // In a real app, this would prompt the user for confirmation
  console.log("Command to confirm:", command.join(" "));
  if (applyPatch) {
    console.log(
      "Apply patch content:",
      applyPatch.patch.substring(0, 100) + "...",
    );
  }

  // For this example, we'll just auto-approve
  return {
    review: ReviewDecision.YES,
  };
}

// Example function to handle response items
function handleItem(item: any) {
  console.log("Received item:", JSON.stringify(item, null, 2));
}

// Example function to handle loading state
function handleLoading(loading: boolean) {
  console.log("Loading state:", loading);
}

// Example function to handle response ID
function handleLastResponseId(id: string) {
  console.log("Last response ID:", id);
}

// Example of using the agent
async function runExample() {
  // Create an agent instance
  const agent = new AgentLoop({
    model: "gpt-4",
    instructions: "You are a helpful assistant.",
    approvalPolicy: ApprovalPolicy.SUGGEST,
    onItem: handleItem,
    onLoading: handleLoading,
    getCommandConfirmation,
    onLastResponseId: handleLastResponseId,
  });

  // Example input with an apply_patch command
  const input = [
    {
      type: "function_call",
      call_id: "example-apply-patch",
      arguments: JSON.stringify({
        cmd: [
          "apply_patch",
          "*** Begin Patch\n*** Add File: example.txt\n+This is an example file\n*** End Patch",
        ],
        workdir: process.cwd(),
      }),
    },
  ];

  // Run the agent with input
  await agent.run(input);

  // Example of cancellation
  setTimeout(() => {
    console.log("Cancelling agent...");
    agent.cancel();
  }, 5000);

  // Example of an unsupported command (will be rejected)
  const input2 = [
    {
      type: "function_call",
      call_id: "example-unsupported",
      arguments: JSON.stringify({
        cmd: ["ls", "-la"],
        workdir: process.cwd(),
      }),
    },
  ];

  // Wait a bit then run the second command
  setTimeout(async () => {
    console.log("Running second command (will be rejected)...");
    await agent.run(input2);

    // Finally, terminate the agent
    setTimeout(() => {
      console.log("Terminating agent...");
      agent.terminate();
    }, 1000);
  }, 6000);
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample().catch(console.error);
}

