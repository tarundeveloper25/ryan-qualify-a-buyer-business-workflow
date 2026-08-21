---
name: qualify-a-buyer-business-child
description: Child execution skill for Qualify a Buyer Business. 3 steps, mode: browserless.
type: child_skill
---

# Qualify a Buyer Business — Child Skill

## Purpose
Execute the "Qualify a Buyer Business" automation workflow.

## Operator Details
- **Mode:** browserless
- **Steps:** 3
- **Groups:** 0

## Step Summary

| # | Action | Intent |
|---|--------|--------|
| 1 | persona_capability | Gmail — read buyer inquiry |
| 2 | persona_capability | Sheets — check budget |
| 3 | persona_capability | Calendar — suggest slots |

## Execution Notes
- Steps execute sequentially by step_number
- Template variables ({{stepId.var}}) resolve from prior step exports
- Browser steps use selectorPrompts as vision AI fallback if selectors fail
