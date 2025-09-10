# Project Agent Instructions (Overall)

Audience: autonomous coding agents working in this repository.
Scope: applies to the entire project unless superseded by a more specific AGENTS.md deeper in the tree.

Goals:
- Ensure agents acquire shared context before implementing any feature.
- Standardize the kickoff interaction with the user.

Protocol:
1) Read `llm-context.md` (project invariants and domain context) to understand non-changing assumptions and terminology.
2) Read `llm-context/common-instructions.md` for the Documentation‑Driven Development workflow and quality gates.
3) Acknowledge readiness, then ask the user which input spec to start with from `llm-context/project-input/*.md` (e.g., `auth.md`). Do not implement yet.
4) After the user specifies the input file, follow the planning and clarification guidance:
   - Draft a concise execution plan based solely on the selected input spec.
   - If anything is ambiguous, ask targeted, close‑ended questions (prefer MCQ/yes‑no) via chat, batch where possible. Do not proceed until resolved.
5) Implement strictly within scope and allowed paths as defined in the input spec and the common instructions. Apply gates (format, lint, build/typecheck, tests, coverage) as specified.

User Interaction Template:
- “I’ve reviewed `llm-context.md` and `llm-context/common-instructions.md` and have sufficient context to begin. Which feature spec should I start with from `llm-context/project-input/`? For example: `auth.md`, `content.md`, or another?”

Notes:
- If chat is unavailable or answers do not resolve a blocking ambiguity, stop and record a Blocking Issue per the common instructions.
- Respect existing conventions and keep changes minimal and targeted.

