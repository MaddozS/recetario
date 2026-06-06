# Harness Improvements Reference

Created: 2026-06-06
Source: Post-breadcrumb analysis (task-20260606-analyst-report.md, task-20260606-synthesizer-report.md)

## Purpose

This document captures improved templates and checklists for the orchestrator workflow. Use these when generating analysis reports, task files, and review checklists in future sessions.

---

## 1. Analysis Template Additions

Add these sections to the standard analysis template:

### Configuration Constraints Check

```markdown
## Configuration Constraints
- [ ] `astro.config.mjs` — icon whitelist (new icons needed?), integrations, build settings
- [ ] `package.json` — new dependencies required?
- [ ] Environment variables — new env vars needed?
```

### Responsive State Table

```markdown
## Responsive States
| Page | Condition | Mobile (< md) | Desktop (≥ md) |
|------|-----------|---------------|-----------------|
| /page-a | default | [description] | [description] |
| /page-a | empty state | [description] | [description] |
| /page-b | nested | [description] | [description] |
```

---

## 2. Task File Template Additions

### Icon Whitelist Guardrail

Add to every task file's Guardrails section when the task touches `.astro` files:

```markdown
- **Icon whitelist**: Any new `lucide:*` icon must be verified at lucide.dev and added to `astro.config.mjs` `include.lucide` array (alphabetically). Report additions in your task report.
```

### Responsive State Enumeration

When the task involves responsive UI, include a state table in the Context section:

```markdown
### Behavioral States

| State | Condition | Mobile | Desktop |
|-------|-----------|--------|---------|
| No data | [condition] | [what renders] | [what renders] |
| Default | [condition] | [what renders] | [what renders] |
| Nested | [condition] | [what renders] | [what renders] |
```

---

## 3. Reviewer Checklist Additions

### Icon Validations

Add after "Conventions" section:

```markdown
### Icon Validations
- [ ] All `Icon name="lucide:*"` names exist in `astro.config.mjs` `include.lucide` array
- [ ] All icon names are valid lucide icons (verify at lucide.dev)
- [ ] New icon additions reported in implementer report
- [ ] Icons added alphabetically to whitelist
```

### Visual QA

Add after "Build" section:

```markdown
### Visual QA
- [ ] Desktop (1280px): UI renders correctly, no broken layout
- [ ] Mobile (375px): Responsive behavior matches expectations
- [ ] Mobile/desktop parity: both views provide equivalent information
- [ ] No broken icons or missing assets
- [ ] Visual quality: looks intentional, not just functionally present
```

### Behavioral Simulation

Add as final checklist section:

```markdown
### Behavioral Simulation
For each page/state combination in the task file's state table:
- [ ] Mentally render the HTML at mobile viewport — does it make sense?
- [ ] Mentally render the HTML at desktop viewport — does it make sense?
- [ ] No fake navigation elements (links to nowhere, buttons that do nothing)
- [ ] Current page/section clearly indicated in both viewports
```

---

## 4. Lessons Learned

| Issue | Root Cause | Prevention |
|-------|-----------|------------|
| Icon not in whitelist | No whitelist check in any task/review | Icon validation guardrail in all task files |
| Invalid icon name used | No lucide.dev verification | Icon name validation step |
| Mobile showed fake back-link | Task spec didn't enumerate top-level state | Responsive state table in task files |
| Mobile omitted current label | Task described mobile as single case | State enumeration + parity rule |
| Reviewer missed all 3 mobile bugs | Checklist was pattern-only, no behavioral simulation | Behavioral simulation checklist section |
| Post-PASS visual redesign | No visual QA step | Visual QA checklist section |

---

## 5. Quick Reference: Icon Workflow

When adding a new icon to the project:

1. **Find**: Search for icon at https://lucide.dev/icons
2. **Verify**: Confirm exact name (e.g., `chevron-right` not `chevrons-right`)
3. **Check**: Read `astro.config.mjs` lines 28-90 — is it already there?
4. **Add**: If missing, insert alphabetically into the `include.lucide` array
5. **Report**: Note the addition in your task report
6. **Review**: Reviewer cross-checks report against `astro.config.mjs`
