import type { SliceCellObject, SliceLane } from "../../engine/types";
import type { GenContext } from "../generator";
import { cloneGrooveLane } from "../groove";
import type { SliceRole } from "../roles";
import { pickRole } from "../roles";
import { clamp, lerp } from "../rng";

export function makeLane(name: string, ctx: GenContext): SliceLane {
  return cloneGrooveLane(ctx.pocket, name);
}

export function density(ctx: GenContext, min: number, max: number): number {
  return clamp(ctx.knobs?.density ?? lerp(min, max, ctx.intensity), min, max);
}

export function cell(
  ctx: GenContext,
  role: SliceRole,
  options: Omit<SliceCellObject, "slice"> = {},
): SliceCellObject {
  return {
    slice: pickRole(ctx.rng, role, ctx.corpse),
    ...options,
  };
}

export function setStep(
  lane: SliceLane,
  step: number,
  value: SliceCellObject | number | null,
): void {
  if (step >= 0 && step < lane.steps.length) lane.steps[step] = value;
}

export function humanTiming(ctx: GenContext, maxMs: number): number {
  const jitterMs = Math.min(maxMs, ctx.groove.jitterMs + maxMs * ctx.intensity * 0.35);
  return ((ctx.rng.next() * 2 - 1) * jitterMs) / 1000;
}

export function barStep(ctx: GenContext, bar: number, step: number): number {
  return bar * ctx.stepsPerBar + (step % ctx.stepsPerBar);
}
