---
name: qualify-a-buyer-business-child
description: Child execution skill for Qualify a Buyer Business. 8 steps, mode: browserless.
type: child_skill
---

# Qualify a Buyer Business — Child Skill

## Purpose
Execute the "Qualify a Buyer Business" automation workflow.

## Operator Details
- **Mode:** browserless
- **Steps:** 8
- **Groups:** 0
- **Template Variables:** `{{step-a0003.inquiry}}`, `{{step-a0005.qualification}}`

## Step Summary

| # | Action | Intent |
|---|--------|--------|
| 1 | navigate | Start buyer qualification workflow |
| 2 | confirmation | Approve Gmail inquiry read |
| 3 | mcp_tool | Read and summarize buyer inquiry |
| 4 | confirmation | Approve Sheets budget check |
| 5 | mcp_tool | Check budget and score buyer |
| 6 | confirmation | Approve Calendar availability read |
| 7 | mcp_tool | Suggest three unbooked call slots |
| 8 | api_output | Return scored buyer response |

## Execution Notes
- Steps execute sequentially by step_number
- Template variables ({{stepId.var}}) resolve from prior step exports
- Browser steps use selectorPrompts as vision AI fallback if selectors fail
