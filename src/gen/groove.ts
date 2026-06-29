import type { SliceCellObject, SliceLane } from "../engine/types";
import type { Rng } from "./rng";

export interface GrooveTemplate {
  swingMs: number;
  snareLagMs: number;
  hatPushMs: number;
  jitterMs: number;
}

export const DEFAULT_GROOVE: GrooveTemplate = {
  swingMs: 12,
  snareLagMs: 9,
  hatPushMs: -4,
  jitterMs: 2,
};

const CANONICAL_BAR: readonly SliceCellObject[] = [
  { slice: 1, gain: 0.9 },
  { slice: 11, gain: 0.38 },
  { slice: 3, gain: 0.55 },
  { slice: 4, gain: 0.46 },
  { slice: 5, gain: 0.82 },
  { slice: 6, gain: 0.42 },
  { slice: 7, gain: 0.68 },
  { slice: 8, gain: 0.62 },
  { slice: 9, gain: 0.72 },
  { slice: 10, gain: 0.5 },
  { slice: 11, gain: 0.44 },
  { slice: 12, gain: 0.68 },
  { slice: 13, gain: 0.7 },
  { slice: 14, gain: 0.58 },
  { slice: 15, gain: 0.46 },
  { slice: 16, gain: 0.5 },
];

const PROTECTED_STEPS = new Set([0, 4, 8, 12]);

export function buildGroovePocket(params: {
  rng: Rng;
  bars: number;
  stepsPerBar: number;
  startBar: number;
  groove?: GrooveTemplate;
}): SliceLane {
  const groove = params.groove ?? DEFAULT_GROOVE;
  const steps = Array.from({ length: params.bars * params.stepsPerBar }, (_, index) => {
    const absoluteBar = Math.floor(index / params.stepsPerBar) + params.startBar;
    const inBar = index % params.stepsPerBar;
    const base = CANONICAL_BAR[inBar % CANONICAL_BAR.length];
    const cell = { ...base };
    applyVariantEconomy(cell, inBar, absoluteBar, params.rng);
    applyPhraseGravity(cell, inBar, absoluteBar);
    cell.timing = grooveTiming(inBar, groove, params.rng);
    cell.gate = cell.gate ?? 0.055;
    return cell;
  });

  return {
    type: "slice",
    name: "groove substrate",
    steps,
  };
}

export function cloneGrooveLane(lane: SliceLane, name = lane.name): SliceLane {
  return {
    ...lane,
    name,
    steps: lane.steps.map((step) => {
      if (step == null || step === 0) return null;
      return typeof step === "number" ? { slice: step } : { ...step };
    }),
  };
}

function applyVariantEconomy(
  cell: SliceCellObject,
  inBar: number,
  absoluteBar: number,
  rng: Rng,
): void {
  if (PROTECTED_STEPS.has(inBar)) return;
  const phase = absoluteBar % 4;
  if (phase === 1 && inBar === 14 && rng.chance(0.7)) {
    cell.slice = 18;
    cell.gain = 0.4;
  } else if (phase === 2 && inBar === 6 && rng.chance(0.65)) {
    cell.slice = 21;
    cell.gain = 0.34;
  } else if (phase === 3 && inBar === 15 && rng.chance(0.8)) {
    cell.slice = 7;
    cell.gain = 0.64;
  }
}

function applyPhraseGravity(cell: SliceCellObject, inBar: number, absoluteBar: number): void {
  const phraseEnd = absoluteBar % 4 === 3;
  if (inBar === 0) cell.gain = (cell.gain ?? 1) * (phraseEnd ? 1.12 : 1.04);
  if (phraseEnd && inBar >= 13) cell.gain = (cell.gain ?? 1) * 0.88;
}

function grooveTiming(inBar: number, groove: GrooveTemplate, rng: Rng): number {
  let ms = 0;
  if (inBar % 2 === 1) ms += groove.swingMs;
  if (inBar === 4 || inBar === 12) ms += groove.snareLagMs;
  if (inBar % 2 === 1 || inBar === 2 || inBar === 6 || inBar === 10 || inBar === 14) {
    ms += groove.hatPushMs;
  }
  ms += (rng.next() * 2 - 1) * groove.jitterMs;
  return ms / 1000;
}
