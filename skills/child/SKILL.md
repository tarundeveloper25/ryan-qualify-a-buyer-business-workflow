---
name: qualify-a-buyer-child
description: Child execution skill for Qualify a buyer. 1 steps, mode: browserless.
type: child_skill
---

# Qualify a buyer — Child Skill

## Purpose
Execute the "Qualify a buyer" automation workflow.

## Operator Details
- **Mode:** browserless
- **Steps:** 1
- **Groups:** 0

## Step Summary

| # | Action | Intent |
|---|--------|--------|
| 1 | navigate | Workflow Start |

## Execution Notes
- Steps execute sequentially by step_number
- Template variables ({{stepId.var}}) resolve from prior step exports
- Browser steps use selectorPrompts as vision AI fallback if selectors fail
