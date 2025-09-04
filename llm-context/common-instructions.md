# Documentation-Driven Development (D3) — **common-instructions.md**

**Audience:** autonomous coding agents running inside a git-versioned software project  
**Contract:** deterministically convert feature specs (Markdown) into code,
tests, and a traceable report—**without** surprising changes.

---

## 0) Principles (non-negotiable)

* **Least Surprise:** Respect existing conventions; make the smallest change set
that satisfies the spec. No stealth refactors or tooling changes unless explicitly required.
* **Scope Lock:** Implement **only** what the target input file specifies. Do not add “nice to have” work.
* **Determinism & Idempotency:** Re-running a completed step does not change the repo (no-diff).
* **Safety:** No secrets in code, logs, or VCS. Prefer typed config + env indirection.
* **Escalation:** If the spec is missing/ambiguous/incorrect, **stop the run**, log a **Blocking Issues** section in the output report, and—if an interactive chat is available—raise the issue to the user.

---

## 1) Repository Layout

```
<project-root>/
  llm-context/
    common-instructions.md
    project-input/                   # one feature per file
      *.md
    project-output/                  # one report per input file (append-only runs)
      *.md
  <source code>                      # application code
  <tests>                            # test code (layout may vary)
```

**Invariant:** For each `llm-context/project-input/<feature>.md` there is exactly one output report at `llm-context/project-output/<feature>.md`.

---

## 2) Normative Language

* **MUST / MUST NOT** = hard requirement
* **SHOULD / SHOULD NOT** = strong recommendation; deviations MUST be justified in the output report
* **MAY** = optional

---

## 3) High-Level Workflow

1. **Select Target**: Use the input file named in the prompt (e.g., `auth.md`).
2. **Parse & Validate** the input spec (schema in §6). Detect missing fields, cycles in `depends_on`, or disallowed paths.
3. **Plan** strictly from the spec; no scope expansion.
4. **Execute Steps in Order** (see §9 gates):

   * Apply the **minimal** code changes within `allowed_paths`.
   * Insert/Reuse **anchors** (schema in §5).
   * Run **format → lint → build/typecheck → tests → coverage** (ordered, §9).
   * On success, record **exact file line ranges**, commit (one commit per step), and append to the report.
   * On failure, **rollback the step**, log diagnostics as **Failed**, and **stop the run**.
5. **Finalize**: Append run summary, artifact index, and coverage deltas.

---

## 4) VCS Discipline

* **Branch:** operate on `d3/<feature_id>`. If absent, create it from the default branch.
* **Default Branch Detection:** use the repository’s configured default; if unknown, assume `main`.
* **Rebase Policy:**

  * Before **step-01** and before **finalize**, rebase `d3/<feature_id>` onto the default branch.
  * On conflict, **stop** and record a **Blocking Issue** (do not auto-resolve).
* **Atomic Commits:** exactly one commit per step (plus at most one small corrective commit if gate fixes are required).
* **Rollback:**

  * If a step has **no commit** yet: discard edits.
  * If a step **committed**: `git revert <step-commit-sha>` to undo.
* **Commit Message Format:**

  ```
  [D3][<feature_id>][<step-id>] <imperative summary>

  Files:
  - path#Lstart-Lend  (<anchor-id>)
  Tests:
  - path#Lstart-Lend
  ```

---

## 5) File References & Anchors

* **Anchor ID Schema (unique & stable):**
  `// [D3:<feature_id>.<step-id>:<slug>]` (language-appropriate comment)
  Allowed chars for `<slug>`: `[a-z0-9._-]`
* **Placement:** put an anchor at the start of each edited logical block.
* **Reuse:** re-runs of the **same step on the same block** MUST reuse the same anchor.
* **Line-Range Notation:** `path/to/file.ext#L<start>-L<end>`
* **Range Calculation:**

  1. If an anchor exists, compute range relative to it.
  2. If not, insert the anchor, then capture the range.
  3. If content moves in later edits, **update ranges** in the report but keep the **same anchor ID**.

---

## 6) Input Spec Schema (project-input/\*.md)

```markdown
---
feature_id: <id>                   # REQUIRED, non-empty
title: <short title>               # REQUIRED
allowed_paths: ["src/**","tests/**"]  # REQUIRED
language: <optional>
frameworks: [<optional>]
build:                              # OPTIONAL if project tooling is discoverable
  format: ["<bin>", "<arg>", ...]
  lint:   ["<bin>", "<arg>", ...]
  test:   ["<bin>", "<arg>", ...]
  coverage_min: 0.80
constraints: []                     # runtime/platform constraints
assumptions: []                     # e.g., “keys provided via env”
artifacts:
  runtime_env: [".env.example"]     # files to create/update
  config: ["src/config/*.ts"]
steps:                               # REQUIRED, ordered, unique ids
  - id: step-01
    title: <what to build>
    rationale: <why>
    depends_on: []                  # optional
    changes:
      - create: "src/..."
      - modify: "src/..."
    acceptance_criteria:
      - "<verifiable behavior>"
    tests:
      - path: "tests/...test.*"
        type: unit|integration|e2e
        cases:
          - "<case name>"
```

**Agent MUST Validate:**

* `feature_id`, `title`, `allowed_paths`, and `steps` exist.
* `steps[*].id` are unique; **no dependency cycles** in `depends_on`.
* Every step includes non-empty `acceptance_criteria` **and** at least one `tests` entry.
* All file operations stay within `allowed_paths` (see exceptions in §8).

**If invalid or incomplete:** **stop**, write **Blocking Issues** (see §7), and—if chat is available—notify the user.

---

## 7) Output Report Schema (project-output/\*.md)

The output file **accumulates multiple runs** over time. Each run is **append-only**.

```markdown
# D3 Execution Report — <feature_id>: <title>

## Run <ISO-8601-Z timestamp>
- Agent Version: d3-agent/1.0
- Git Base: <base-commit-sha>
- Input Spec: llm-context/project-input/<feature>.md
- Status: ✅ Completed | ⚠️ Partial | ❌ Failed
- Steps Attempted: <N>/<M>
- Commits: <count>
- Coverage: <before> → <after> (target: <coverage_min|0.80>)

### Artifact Index
| Kind    | Path                    | Notes     |
|---------|-------------------------|-----------|
| Config  | src/config/auth.ts      | created   |

### Step Logs
#### <step-id>: <title>
- Result: ✅ Success | ❌ Failed
- Description: <brief>
- Files Changed:
  - `src/foo.ts#L10-L58`   <!-- [D3:auth.step-01:cookie-schema] -->
- Commits:
  - `<sha>` `[D3][auth][step-01] cookie schema`
- Tests Added/Modified:
  - `tests/foo.test.ts#L1-L85`
- Gates:
  - Format: pass | fail
  - Lint: pass | fail
  - Build: pass | fail
  - Tests: pass | fail (X passed)
  - Coverage: <xx%> (>= target)
- Notes: <edge cases/deviations>

### Blocking Issues (present only if the run stopped)
- <problem>  
  **Impact:** <why it blocks>  
  **Proposed Fix:** <minimal edit to spec/env>  
  **User Escalation:** <raised via chat: yes|no>
```

---

## 8) Allowed Paths & Byproducts

* **Code/Test Changes:** MUST be confined to `allowed_paths`.
* **Byproduct Exemptions (auto-generated):** `coverage/**`, `dist/**`, `*.map`, `*.snap` MAY be created/updated and are **exempt** from `allowed_paths` checks.

---

## 9) Gates & Quality Bar (per step, ordered)

1. **Format** (respect project tooling).
2. **Lint** (no new errors; warnings allowed only if noted in step log).
3. **Build/Typecheck** (no errors).
4. **Tests** (all pass; newly added tests MUST pass).
5. **Coverage**

   * If project defines thresholds, **honor them**.
   * Else use **global line coverage ≥ 80%** or the `coverage_min` in the input spec.
     **If any gate fails:** rollback the step (see §4), mark **Failed**, write diagnostics, and **stop the run** (do not continue to later steps).

---

## 10) Tooling Discovery Fallback

If `build` commands are **not** specified in the input spec:

1. Inspect project configuration in this order and adopt existing conventions:

   * `package.json` scripts (format/lint/test),
   * `pyproject.toml` / `pytest.ini`,
   * `go.mod` / common make targets.
2. Record discovered commands in the output report (Summary).
3. If nothing is discoverable, emit a **Blocking Issues** entry specifying the exact commands required.

---

## 11) Code Generation Rules

* Follow existing project style (folder layout, lint rules, language level).
* Introduce new modules with a short docstring (purpose, inputs/outputs).
* Keep changes minimal; no cross-cutting refactors unless explicitly required by the step.
* Configuration is injectable (env/config); **do not** hard-code secrets or environment values.

---

## 12) Tests Authoring Rules

* Map tests directly to each step’s `acceptance_criteria`.
* Prefer black-box tests at public boundaries; add unit tests for pure logic.
* Name tests descriptively (e.g., `redirects_anonymous`).
* If the project already defines a runner/layout, reuse it.

---

## 13) Dry-Run Mode

If the input spec sets `execution_mode: dry-run`:

* Do **not** write code or commit.
* Produce a **Proposed Files Changed** table with **anchors only**; line numbers remain **`TBD`**.
* Run no gates; estimate risk/impact in Notes.

---

## 14) Performance & Security Quick Checks

Per step, perform a lightweight scan:

* **Security:** injection risks, unsafe cookies/headers, plaintext secrets, insecure transports.
* **Performance:** accidental quadratic loops, sync I/O on hot paths, N+1 queries.

If an issue is **within scope**, fix it minimally; otherwise, note as TODO in the step log.

---

## 15) Ambiguity, Missing Data, or Incorrect Specs

* **Ambiguous/Missing:** stop before code changes. Log **Blocking Issues** with precise missing fields and a **minimal** proposed edit to the spec or environment.
* **Likely Incorrect Spec:** if the agent is confident a spec statement is wrong or harmful, **do not implement it**. Stop, log a **Blocking Issue** with justification and a minimal corrective proposal.
* **User Escalation:** If an interactive chat is available, also raise the issue to the user and record `User Escalation: yes` in the report.

---

## 16) Execution Algorithm (Reference)

1. Read `llm-context/project-input/<feature>.md`.
2. Validate schema; detect `depends_on` cycles; verify `allowed_paths`. If any issue → **Blocking Issues** and stop.
3. Determine build/lint/test tooling (use spec or discover per §10).
4. Checkout/create `d3/<feature_id>`, rebase on default branch.
5. For each step (respecting `depends_on`):

   * Apply minimal edits within `allowed_paths`.
   * Insert/reuse anchors (§5).
   * Run gates (§9).
   * On success: record file ranges, commit, append **Step Log**.
   * On failure: rollback, mark **Failed**, log diagnostics, **stop**.
6. Rebase again on default branch; if conflict → **Blocking Issue** and stop.
7. Append Summary, Artifact Index, and coverage deltas; end run.

---

## 17) What Not To Do

* Do not modify unrelated files or project-wide tooling without explicit spec instruction.
* Do not weaken gates to pass tests.
* Do not fabricate results, coverage, or line ranges.
* Do not continue to later steps after a failure.

---

## 18) Templates (Starters)

### Input Spec Starter

```markdown
---
feature_id: <id>
title: <short title>
allowed_paths: ["src/**","tests/**"]
build:
  format: ["<tool>","<cmd>"]
  lint:   ["<tool>","<cmd>"]
  test:   ["<tool>","<cmd>"]
  coverage_min: 0.80
constraints: []
assumptions: []
artifacts: { runtime_env: [".env.example"], config: [] }
steps:
  - id: step-01
    title: <what to build>
    rationale: <why>
    depends_on: []
    changes:
      - create: "src/..."
      - modify: "src/..."
    acceptance_criteria:
      - "<verifiable behavior>"
    tests:
      - path: "tests/...test.*"
        type: unit
        cases:
          - "<case>"
```

### Output Report Starter

```markdown
# D3 Execution Report — <feature_id>: <title>

## Run 2025-09-04T14:51:02Z
- Agent Version: d3-agent/1.0
- Git Base: <sha>
- Input Spec: llm-context/project-input/<feature>.md
- Status: <...>
- Steps Attempted: <N>/<M>
- Commits: <count>
- Coverage: <before> → <after> (target: <X>)

### Artifact Index
| Kind | Path | Notes |
|------|------|-------|

### Step Logs
#### step-01: <title>
- Result: <...>
- Description: <...>
- Files Changed:
  - path#Lstart-Lend  <!-- [D3:<feature>.step-01:<slug>] -->
- Commits:
  - <sha> `[D3][<feature>][step-01] ...`
- Tests Added/Modified:
  - tests/...#Lstart-Lend
- Gates:
  - Format: pass | fail
  - Lint: pass | fail
  - Build: pass | fail
  - Tests: pass | fail
  - Coverage: <xx%>
- Notes: <...>

### Blocking Issues
<empty if none>
```

---

**End of file.**
