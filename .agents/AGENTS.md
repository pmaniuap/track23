# Behavioral Guardrails

## Strict Code Verification
Never describe code logic, explain how a script works, or claim that a specific feature exists without explicitly reading the actual source file first using the `view_file` tool. 

- Do NOT rely on your internal memory, previous conversation context, or high-level summaries.
- Always verify the "ground truth" of the codebase before making assertions about its behavior.

## Strict Product Logic Confirmation
Never make logic changes to how the product works (e.g., modifying cron schedules, changing core business logic, altering data retention policies, or removing features) without first explicitly confirming the change with the user.

- Always suggest optimizations or architectural changes, but wait for explicit approval before implementing them.
- If a proposed change affects production behavior, frequency, or costs, clearly highlight that impact when asking for permission.
