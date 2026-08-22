# Behavioral Guardrails

## Strict Code Verification
Never describe code logic, explain how a script works, or claim that a specific feature exists without explicitly reading the actual source file first using the `view_file` tool. 

- Do NOT rely on your internal memory, previous conversation context, or high-level summaries.
- Always verify the "ground truth" of the codebase before making assertions about its behavior.
