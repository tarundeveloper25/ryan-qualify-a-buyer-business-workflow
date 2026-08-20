---
name: qualify-a-buyer-runner
description: Run the "Qualify a buyer" action through the automation API and poll run status.
---

# Qualify a buyer Runner

## Goal
Run an existing action and return the `runId` so the caller can track progress.

## Authentication
- Use an API token in `Authorization: Bearer <token>`.
- Recommended scope: `api:access` (legacy: `automation:run` + `automation:read`).

## Required Input Keys
This action has no required runtime inputs.

## Start Run
- Endpoint: `POST https://gabrieloperator.com/api/automation/run/0ec94bd1-83bc-4bdc-a529-1f62c0150453/6a86eb6cb8a54c2e1a012033`
- JSON body:

```json
{
  "parameters": {},
  "runContext": {},
  "dynamicLoopItems": [],
  "selectedLoopGroupId": null,
  "connectorOverrides": [],
  "variableOverrides": {},
  "liveBrowserMode": false,
  "liveBrowserProviderId": "auto",
  "name": "API Run"
}
```

## Poll Status
- Endpoint: `GET https://gabrieloperator.com/api/automation/status/{runId}`
- Continue polling until status is terminal (`COMPLETED`, `FAILED`, or `CANCELLED`).

## Expected Response Format

When this connector completes, write your primary output using a `set_api_output` step
so it appears in the status response as `data.output`.

The calling supervisor reads `data.output` from `GET https://gabrieloperator.com/api/automation/status/{runId}` once the run
reaches a terminal status (`COMPLETED`, `FAILED`, or `CANCELLED`).

### set_api_output contract
The output must be a JSON object. Recommended structure:

```json
{
  "result": "<primary answer or extracted data>",
  "summary": "<one-sentence human-readable summary>",
  "metadata": {}
}
```

### Take-control behaviour
If a step requires human interaction, the run transitions to `paused` status.
The status endpoint returns:

```json
{
  "status": "paused",
  "pauseContext": {
    "message": "Human input required",
    "url": "https://...",
    "stepNumber": 5
  },
  "liveDebugUrl": "https://..."
}
```

Resume the run with:
```
POST https://gabrieloperator.com/api/automation/resume/{runId}
{ "agentId": "0ec94bd1-83bc-4bdc-a529-1f62c0150453", "actionId": "6a86eb6cb8a54c2e1a012033" }
```

