# /update-agents-md

## Overview
Use `/update-agents-md` whenever AGENTS.md needs a new rule—either to prevent repeat AI mistakes or to reflect a process change. The agent reads the free-form problem statement, proposes the best location and wording for the update, shows the diff for review, and applies it only after the user approves.

## Usage
```text
/update-agents-md
[Describe the problem and the desired rules in free-form text.]
```

**Example 1 (add a guardrail for AI behavior):**
```text
/update-agents-md
During E2E runs the AI executed only part of the YAML suite and still reported success.
Add a rule stating "A suite == the entire YAML file run end to end".
Disallow skipping cases for reasons like "time limit" or "main cases only".
```

**Example 2 (spec update):**
```text
/update-agents-md
The form UI pattern doc never clarified the priority of view mode.
Add a rule: "When isViewMode is true, the component must render read-only regardless of other flags".
Place the condition before edit-mode logic.
```

**Example 3 (new operational rule):**
```text
/update-agents-md
Agents sometimes leave background processes running.
Add a rule: "Any process started by the AI (dev server, Cloud SQL Proxy, background jobs) must be stopped by the AI when the task ends".
```

## Prerequisites
- Understand the structure and tone of the current `AGENTS.md`.
- New rules must be specific and actionable.
- Run inside a git-managed working tree.

## Execution Flow (steps)

### 1. Read and analyze AGENTS.md
- Load the latest file content.
- Note the section hierarchy.
- Highlight existing rules related to the requested topic.

### 2. Analyze the user input
Classify the problem:
- AI misbehavior (off-track actions, rework, policy violations).
- Spec change or new requirement.
- Gaps or ambiguity in existing rules.
- Process / workflow friction.

Determine the impact area:
- Coding conventions.
- Implementation patterns.
- Operations / runbooks.
- Debugging & testing strategy.
- Infrastructure / deploy guidelines.
- Security policies.

### 3. Pick the best section and granularity
Follow this order of preference:

**Extend an existing section (preferred):**
- Same topic already exists.
- Same discipline (coding, ops, etc.).
- Same delivery phase (implementation, testing, deploy).

**Create a new section (only when necessary):**
- The topic does not fit anywhere.
- The change introduces a new, substantial theme.

**Writing style:**
- Keep the same hierarchy depth as surrounding items.
- Avoid decorative callouts (no emojis, "⚠️", etc.).
- Stick to concise, factual sentences.

### 4. Check consistency with existing rules
- **Duplication:** ensure the rule does not already exist verbatim.
- **Conflicts:** ensure the new wording does not contradict earlier guidance.
- **Mergeability:** see if the idea should be appended to a nearby bullet instead of adding a brand new item.

### 5. Produce and present the update proposal
Use this format:

```markdown
## Proposed update

### Target section
[Section name + breadcrumb]

### Diff
```diff
[Show the diff snippet]
```

### Rationale
- [Why this section?]
- [Why this wording?]
- [Interaction with existing rules?]

### Checks
- Duplicate rule: [none / found (details)]
- Conflict: [none / found (details)]
- New section required: [no / yes (reason)]
```

### 6. Wait for approval
- **If approved:** edit `AGENTS.md`, confirm completion, and show `git status` if asked.
- **If changes are requested:** iterate on the proposal before editing the file.
- **If rejected:** cancel the change and capture the reasoning if it helps future updates.

## AI analysis points

### Identify the root cause
- Missing rule entirely.
- Rule exists but is too vague.
- Rule exists but misses edge cases.
- Multiple rules contradict each other.

### Pick the right abstraction level
- Add code samples for implementation patterns.
- Use high-level principles for philosophy sections.
- Provide checklists for operational or review steps.

### Match the existing style
- Mirror heading levels.
- Use `- ` for bullets (no `*`).
- Keep a single blank line before headings and lists.
- Insert spaces between Japanese and half-width alphanumerics if any remain (AGENTS.md is English-first but remains consistent).

### Respect section semantics
- **Coding conventions:** include Good/Bad examples when applicable.
- **Implementation patterns:** provide templates and usage notes.
- **Operational rules:** describe exact triggers, approvals, and commands.
- **Debug/test strategy:** include CLI commands and success criteria.

## Notes
- Do not deviate from AGENTS.md's writing style.
- Avoid overemphasis (bold/emoji) unless already common in the surrounding section.
- Keep sentences compact and fact-based.
- Use a consistent format for similar rules.
- Leave commits to the user; this command only edits the file.
- When multiple changes are required, ask the user whether to batch them or handle sequentially.

## Update patterns by scenario

### Guardrails against AI misbehavior
- Likely placement: `Operational rules (agent execution)` or `Approval-required actions`.
- Wording should be imperative ("Do X", "Never Y").
- Provide concrete Good/Bad behaviors when necessary.

### Implementation pattern updates
- Likely placement: `Coding conventions` or the language-specific subsection.
- Always include code snippets for both recommended and anti-pattern approaches.
- Document the conditions under which the pattern applies.

### Business-rule or spec updates
- Place inside the relevant business domain section or create a new section if the topic is large.
- Explain the rationale plus any formulas or thresholds.
- Reference supporting docs when available.

## Example proposal
```markdown
## Proposed update

### Target section
`Operational rules (agent execution)` > `Approval-required actions`

### Diff
```diff
 ### Approval-required actions
 - Network access: package add/update, outbound API calls, external registries/docs.
 - Destructive actions: rm -rf, mass renames/deletes, git reset --hard, history rewrites, removing tests, major config rewrites.
+- E2E test execution: when running a YAML suite, execute every case in the file. Never report completion after only a subset. Skipping cases due to "time limit" or "major cases only" is forbidden.
 - Database operations: migrate/seed/truncate/drop or anything that mutates data/schema.
```

### Rationale
- The existing "approval-required" list lacked an explicit rule for E2E suites, so this is the best home.
- Uses the same bullet format, preserving style consistency.
- The wording is strict enough to prevent misinterpretation.

### Checks
- Duplicate rule: none (E2E suite coverage was undocumented).
- Conflict: none.
- New section required: no (fits in the existing operational rules list).
```

**Approve? (yes/no)**

