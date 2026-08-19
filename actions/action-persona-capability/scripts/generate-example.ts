#!/usr/bin/env npx tsx

const NOW = Date.now();
const example = {
  step_number: 2,
  action_type: "persona_capability",
  stepId: "step-a11ce",
  timestamp: NOW,
  label: "Run retained persona skill",
  intent:
    "**Input:** Uses the commandArgs supplied by the persona invocation.\\n\\n**Processing:** Delegates to the configured retained sandbox skill runtime.\\n\\n**Output:** Exports response for downstream workflow steps.",
  personaCapabilityConfig: {
    schemaVersion: 1,
    kind: "sandbox_skill_run",
    execution: {
      type: "sandbox_skill_run",
      skillIds: ["skill-example"],
      timeoutSeconds: 300,
    },
    promptTemplate: "Complete this request: {args}",
  },
  exportedVariables: {
    response: "variables.response",
  },
};

console.log(JSON.stringify(example, null, 2));
