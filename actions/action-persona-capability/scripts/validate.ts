#!/usr/bin/env npx tsx

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const KINDS = [
  "tool",
  "canvas_task_execution",
  "sandbox_skill_run",
  "workflow_endpoint",
] as const;
const STEP_ID_PATTERN = /^step-[a-f0-9]{5}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateWorkflowCanvasBlueprint(
  canvas: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (canvas.blueprintRef !== "inline") {
    errors.push(`${path}.blueprintRef: must be inline; page-backed master-skill Canvas is deprecated and must not be authored in workflows`);
  }
}

function validateSandboxExecution(
  execution: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (
    !Array.isArray(execution.skillIds)
    || !execution.skillIds.some((value) => typeof value === "string" && value.trim())
  ) {
    errors.push(`${path}.skillIds: must contain at least one skill ID`);
  }
  if (
    execution.timeoutSeconds !== undefined
    && (
      typeof execution.timeoutSeconds !== "number"
      || execution.timeoutSeconds < 60
      || execution.timeoutSeconds > 1800
    )
  ) {
    errors.push(`${path}.timeoutSeconds: must be between 60 and 1800`);
  }
}

function validateCanvasSandboxTasks(
  canvas: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (!Array.isArray(canvas.taskTypes)) return;
  canvas.taskTypes.forEach((task, index) => {
    if (!isObject(task) || !isObject(task.execution) || task.execution.type !== "sandbox_skill_run") return;
    validateSandboxExecution(task.execution, `${path}.taskTypes[${index}].execution`, errors);
  });
}

function validateCanvasTaskSequence(canvas: Record<string, unknown>, errors: string[]): void {
  if (canvas.taskSequence === undefined) return;
  if (!isObject(canvas.taskSequence)) {
    errors.push("step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskSequence: must be an object");
    return;
  }
  const sequence = canvas.taskSequence;
  if (sequence.schemaVersion !== 1 || sequence.type !== "duration_chunked_media") {
    errors.push("step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskSequence: must use schemaVersion 1 and type duration_chunked_media");
  }
  const fields = [
    "durationInputKey",
    "storyTaskId",
    "storyboardTemplateTaskId",
    "videoTemplateTaskId",
    "stitchTaskId",
  ];
  for (const field of fields) {
    if (typeof sequence[field] !== "string" || !(sequence[field] as string).trim()) {
      errors.push(`step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskSequence.${field}: is required`);
    }
  }
  if (sequence.continuity !== "previous_video_last_frame") {
    errors.push("step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskSequence.continuity: must be previous_video_last_frame");
  }
  const numericFields = [
    "defaultDurationSeconds",
    "minDurationSeconds",
    "maxDurationSeconds",
    "segmentDurationSeconds",
  ];
  for (const field of numericFields) {
    if (!Number.isInteger(sequence[field]) || Number(sequence[field]) <= 0) {
      errors.push(`step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskSequence.${field}: must be a positive integer`);
    }
  }
  const segment = Number(sequence.segmentDurationSeconds);
  const min = Number(sequence.minDurationSeconds);
  const max = Number(sequence.maxDurationSeconds);
  const defaultDuration = Number(sequence.defaultDurationSeconds);
  if (
    Number.isInteger(segment)
    && Number.isInteger(min)
    && Number.isInteger(max)
    && Number.isInteger(defaultDuration)
    && (
      min > defaultDuration
      || defaultDuration > max
      || defaultDuration % segment !== 0
      || min % segment !== 0
      || max % segment !== 0
    )
  ) {
    errors.push("step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskSequence: duration bounds must align to segmentDurationSeconds");
  }
  const taskTypes = Array.isArray(canvas.taskTypes) ? canvas.taskTypes.filter(isObject) : [];
  const taskIds = new Set(
    taskTypes.map((task) => typeof task.id === "string" ? task.id : "").filter(Boolean),
  );
  const configuredTaskIds = fields.slice(1)
    .map((field) => typeof sequence[field] === "string" ? sequence[field] as string : "")
    .filter(Boolean);
  if (new Set(configuredTaskIds).size !== configuredTaskIds.length) {
    errors.push("step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskSequence: task references must be unique");
  }
  for (const field of fields.slice(1)) {
    const taskId = typeof sequence[field] === "string" ? sequence[field] as string : "";
    if (taskId && !taskIds.has(taskId)) {
      errors.push(`step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskSequence.${field}: references missing task "${taskId}"`);
    }
  }
  const storyboardTask = taskTypes.find((task) => task.id === sequence.storyboardTemplateTaskId);
  if (
    storyboardTask
    && (!isObject(storyboardTask.execution) || storyboardTask.execution.type !== "tool")
  ) {
    errors.push("step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskTypes: storyboard template must use execution.type tool");
  }
  const videoTask = taskTypes.find((task) => task.id === sequence.videoTemplateTaskId);
  if (
    videoTask
    && (!isObject(videoTask.execution) || videoTask.execution.type !== "tool")
  ) {
    errors.push("step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskTypes: video template must use execution.type tool");
  }
  const stitchTask = taskTypes.find((task) => task.id === sequence.stitchTaskId);
  if (
    stitchTask
    && (!isObject(stitchTask.execution) || stitchTask.execution.type !== "stitch_videos")
  ) {
    errors.push("step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskTypes: stitch task must use execution.type stitch_videos");
  }
}

function validate(step: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(step)) return ["step: must be an object"];
  if ("arguments" in step) errors.push('step: must not contain an "arguments" wrapper');
  if (typeof step.step_number !== "number") errors.push("step.step_number: must be a number");
  if (step.action_type !== "persona_capability") errors.push('step.action_type: must be "persona_capability"');
  if (typeof step.stepId !== "string" || !STEP_ID_PATTERN.test(step.stepId)) {
    errors.push("step.stepId: must match /^step-[a-f0-9]{5}$/");
  }
  if (typeof step.timestamp !== "number") errors.push("step.timestamp: must be a number");
  if (typeof step.label !== "string" || !step.label.trim()) errors.push("step.label: is required");
  if (typeof step.intent !== "string" || !step.intent.trim()) errors.push("step.intent: is required");
  if (!isObject(step.personaCapabilityConfig)) {
    errors.push("step.personaCapabilityConfig: must be an object");
    return errors;
  }
  const config = step.personaCapabilityConfig;
  if (config.schemaVersion !== 1) errors.push("step.personaCapabilityConfig.schemaVersion: must be 1");
  if (!KINDS.includes(config.kind as never)) {
    errors.push(`step.personaCapabilityConfig.kind: must be one of ${KINDS.join(", ")}`);
  }
  if (!isObject(config.execution)) {
    errors.push("step.personaCapabilityConfig.execution: must be an object");
  } else if (config.execution.type !== config.kind) {
    errors.push("step.personaCapabilityConfig.execution.type: must match kind");
  } else if (config.kind === "tool" && typeof config.execution.toolId !== "string") {
    errors.push("step.personaCapabilityConfig.execution.toolId: is required");
  } else if (
    config.kind === "workflow_endpoint"
    && typeof config.execution.endpointSlug !== "string"
  ) {
    errors.push("step.personaCapabilityConfig.execution.endpointSlug: is required");
  } else if (
    config.kind === "canvas_task_execution"
    && !isObject(config.execution.canvas)
  ) {
    errors.push("step.personaCapabilityConfig.execution.canvas: is required");
  } else if (
    config.kind === "sandbox_skill_run"
  ) {
    validateSandboxExecution(
      config.execution,
      "step.personaCapabilityConfig.execution",
      errors,
    );
  }
  if (
    config.kind === "canvas_task_execution"
    && isObject(config.execution)
    && isObject(config.execution.canvas)
  ) {
    validateWorkflowCanvasBlueprint(
      config.execution.canvas,
      "step.personaCapabilityConfig.execution.canvas",
      errors,
    );
    validateCanvasSandboxTasks(
      config.execution.canvas,
      "step.personaCapabilityConfig.execution.canvas",
      errors,
    );
  }
  if (config.kind === "canvas_task_execution" && isObject(config.canvasTask)) {
    const canvasTask = config.canvasTask;
    const taskTypes = isObject(config.execution) && isObject(config.execution.canvas)
      ? config.execution.canvas.taskTypes
      : undefined;
    if (typeof canvasTask.sequenceId !== "string" || !canvasTask.sequenceId.trim()) {
      errors.push("step.personaCapabilityConfig.canvasTask.sequenceId: is required");
    }
    if (typeof canvasTask.taskId !== "string" || !canvasTask.taskId.trim()) {
      errors.push("step.personaCapabilityConfig.canvasTask.taskId: is required");
    }
    if (!Array.isArray(taskTypes) || taskTypes.length !== 1) {
      errors.push("step.personaCapabilityConfig.execution.canvas.taskTypes: must contain exactly one task");
    }
    if (
      canvasTask.terminal === true
      && (
        !isObject(canvasTask.aggregateCanvas)
        || !Array.isArray(canvasTask.aggregateCanvas.taskTypes)
        || canvasTask.aggregateCanvas.taskTypes.length !== canvasTask.taskCount
      )
    ) {
      errors.push("step.personaCapabilityConfig.canvasTask.aggregateCanvas.taskTypes: must contain every Canvas task");
    }
    if (canvasTask.terminal === true && isObject(canvasTask.aggregateCanvas)) {
      validateWorkflowCanvasBlueprint(
        canvasTask.aggregateCanvas,
        "step.personaCapabilityConfig.canvasTask.aggregateCanvas",
        errors,
      );
      validateCanvasTaskSequence(canvasTask.aggregateCanvas, errors);
      validateCanvasSandboxTasks(
        canvasTask.aggregateCanvas,
        "step.personaCapabilityConfig.canvasTask.aggregateCanvas",
        errors,
      );
    }
  }
  return errors;
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx validate.ts <step.json>");
  process.exit(1);
}
const errors = validate(JSON.parse(readFileSync(resolve(file), "utf8")) as unknown);
if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("Step is valid.");
