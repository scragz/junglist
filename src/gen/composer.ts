import type { Pattern, SliceCell, SliceCellObject, SliceLane } from "../engine/types";
import type { Generator, GeneratorId, GeneratorKnobs, PaletteId } from "./generator";
import { buildGroovePocket, DEFAULT_GROOVE, type GrooveTemplate } from "./groove";
import { NATURAL_SUCCESSORS, ROLE_SLICES, type MarkovBias, type SliceRole } from "./roles";
import { createRng, seedToNumber, type Rng } from "./rng";
import { registry } from "./constructs";

export type CurveId =
  | "pocket-build-peak-drop-refuse"
  | "front-loaded"
  | "two-rises"
  | "pocket-with-stabs";

export type ArcOperatorType =
  | "Phrase Debt"
  | "Stochastic Caesura"
  | "Structural Absence"
  | "Threat Meter"
  | "Reserved Incompletion";

export interface ArcOperator {
  type: ArcOperatorType;
  atBar: number;
  label: string;
}

export interface ArcSection {
  id: string;
  generatorId: GeneratorId;
  name: string;
  style: PaletteId;
  lands: "L" | "A" | "G";
  bars: number;
  startBar: number;
  tension: number;
  locked: boolean;
  knobs: GeneratorKnobs;
  lanes: SliceLane[];
}

export interface Arc {
  seed: number;
  curve: CurveId;
  sections: ArcSection[];
  operators: ArcOperator[];
  tensionPoints: number[];
  pattern: Pattern;
}

export interface ComposeOptions {
  seed: number;
  bpm?: number;
  stepsPerBar?: number;
  maxBars?: number;
  palettes?: readonly PaletteId[];
  intensityBias?: number;
  lengthBias?: number;
  corpseAmount?: number;
  chokeAmount?: number;
  previous?: Arc;
}

const DEFAULT_PALETTE: readonly PaletteId[] = [
  "Breaks",
  "Footwork",
  "Gabber",
  "Steppers",
  "Power Noise",
];

const FLOOR_TENSION = 0.24;

const CURVES: Record<CurveId, (x: number) => number> = {
  "pocket-build-peak-drop-refuse": (x) => {
    if (x < 0.2) return 0.12 + x * 0.4;
    if (x < 0.62) return 0.2 + (x - 0.2) * 1.65;
    if (x < 0.78) return 0.9 - (x - 0.62) * 3.8;
    return 0.28 - (x - 0.78) * 0.58;
  },
  "front-loaded": (x) => {
    if (x < 0.32) return 0.86 - x * 0.5;
    if (x < 0.58) return 0.22;
    return 0.24 + (x - 0.58) * 0.72;
  },
  "two-rises": (x) => 0.18 + Math.max(0, Math.sin(x * Math.PI * 2.4)) * 0.58,
  "pocket-with-stabs": (x) => {
    const stab = Math.max(0, Math.sin(x * Math.PI * 8));
    return 0.16 + stab * 0.55 + x * 0.08;
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeCell(cell: SliceCell): SliceCellObject | null {
  if (cell == null || cell === 0) return null;
  return typeof cell === "number" ? { slice: cell } : cell;
}

function stepSignature(step: SliceCell): string {
  const cell = normalizeCell(step);
  if (!cell) return "-";
  return [
    cell.slice,
    cell.gain?.toFixed(3) ?? "",
    cell.gate?.toFixed(3) ?? "",
    cell.timing?.toFixed(4) ?? "",
    cell.ratchet ?? "",
    cell.rate?.toFixed(3) ?? "",
    cell.reverse ? "r" : "",
    cell.offset?.toFixed(3) ?? "",
    cell.sat?.toFixed(3) ?? "",
  ].join(",");
}

function cloneLane(lane: SliceLane): SliceLane {
  return {
    ...lane,
    steps: lane.steps.map((step) => {
      const cell = normalizeCell(step);
      return cell ? { ...cell } : null;
    }),
  };
}

function cloneSection(section: ArcSection): ArcSection {
  return {
    ...section,
    knobs: { ...section.knobs },
    lanes: section.lanes.map(cloneLane),
  };
}

function chooseCurve(rng: Rng): CurveId {
  return rng.pick(Object.keys(CURVES) as CurveId[]);
}

function tensionAt(curve: CurveId, x: number, bias: number): number {
  return clamp(CURVES[curve](x) + bias, 0.08, 0.98);
}

function chooseGenerator(
  rng: Rng,
  tension: number,
  palettes: ReadonlySet<string>,
): Generator {
  const choices = registry.validAt(tension, palettes).filter((generator) => generator.id !== "pocket");
  return rng.weighted(
    choices.map((generator) => ({
      item: generator,
      weight: 1 + Math.max(0, 1 - Math.abs(tension - midpoint(generator.tensionRange)) * 2),
    })),
  );
}

function midpoint(range: readonly [number, number]): number {
  return (range[0] + range[1]) / 2;
}

function chooseBars(rng: Rng, generator: Generator, lengthBias: number): number {
  const [min, max] = generator.naturalBars;
  const biased = min + (max - min) * clamp(lengthBias, 0, 1);
  const jitter = rng.int(-1, 1);
  return Math.max(min, Math.min(max, Math.round(biased) + jitter));
}

export function renderSection(params: {
  seed: number;
  generatorId: GeneratorId;
  bars: number;
  tension: number;
  bpm: number;
  stepsPerBar: number;
  startBar?: number;
  groove?: GrooveTemplate;
  corpse?: MarkovBias;
  locked?: boolean;
  knobs?: GeneratorKnobs;
}): ArcSection {
  const generator = registry.byId(params.generatorId);
  const rng = createRng(`${params.seed}:${params.generatorId}:${params.bars}:${params.tension}`);
  const groove = params.groove ?? DEFAULT_GROOVE;
  const pocket = buildGroovePocket({
    rng: rng.fork("pocket"),
    bars: params.bars,
    stepsPerBar: params.stepsPerBar,
    startBar: params.startBar ?? 0,
    groove,
  });
  const lanes = generator.generate({
    rng,
    roles: ROLE_SLICES,
    bpm: params.bpm,
    bars: params.bars,
    stepsPerBar: params.stepsPerBar,
    intensity: params.knobs?.density ?? params.tension,
    pocket,
    groove,
    corpse: params.corpse,
    knobs: params.knobs,
  });

  return {
    id: `${params.generatorId}-${params.seed}-${seedToNumber(params.tension.toFixed(3))}`,
    generatorId: generator.id,
    name: generator.name,
    style: generator.style,
    lands: generator.lands,
    bars: params.bars,
    startBar: 0,
    tension: params.tension,
    locked: params.locked ?? false,
    knobs: params.knobs ?? {},
    lanes,
  };
}

export function composeArc(options: ComposeOptions): Arc {
  const rng = createRng(options.seed);
  const bpm = options.bpm ?? 170;
  const stepsPerBar = options.stepsPerBar ?? 16;
  const maxBars = options.maxBars ?? Math.round(18 + (options.lengthBias ?? 0.5) * 12);
  const palettes = new Set(options.palettes ?? DEFAULT_PALETTE);
  const curve = chooseCurve(rng);
  const sections: ArcSection[] = [];
  const corpse: MarkovBias = { amount: options.corpseAmount ?? 0.55 };
  const groove = DEFAULT_GROOVE;
  let bars = 0;
  let index = 0;

  while (bars < maxBars && sections.length < 9) {
    const x = bars / maxBars;
    const tension = tensionAt(curve, x, (options.intensityBias ?? 0.5) * 0.36 - 0.18);
    const generator = tension <= FLOOR_TENSION ? registry.byId("pocket") : chooseGenerator(rng, tension, palettes);
    const candidateBars = Math.min(
      chooseBars(rng, generator, options.lengthBias ?? 0.5),
      maxBars - bars,
    );
    const locked = options.previous?.sections[index]?.locked
      ? cloneSection(options.previous.sections[index])
      : null;
    const section =
      locked ??
      renderSection({
        seed: options.seed + index * 997,
        generatorId: generator.id,
        bars: Math.max(1, candidateBars),
        tension,
        bpm,
        stepsPerBar,
        startBar: bars,
        groove,
        corpse,
      });
    section.startBar = bars;
    sections.push(section);
    bars += section.bars;
    index++;
  }

  const operators = applyOperators(sections, rng);
  const pattern = buildPatternFromSections({
    seed: options.seed,
    bpm,
    stepsPerBar,
    curve,
    sections,
    operators,
    corpseAmount: options.corpseAmount ?? 0.55,
    chokeAmount: options.chokeAmount ?? 0.18,
    rng,
  });
  const tensionPoints = Array.from({ length: 40 }, (_, i) =>
    tensionAt(curve, i / 39, (options.intensityBias ?? 0.5) * 0.36 - 0.18),
  );

  return { seed: options.seed, curve, sections, operators, tensionPoints, pattern };
}

export function buildPatternFromSections(params: {
  seed: number;
  bpm: number;
  stepsPerBar: number;
  curve: CurveId;
  sections: ArcSection[];
  operators: ArcOperator[];
  corpseAmount: number;
  chokeAmount: number;
  rng: Rng;
}): Pattern {
  const totalBars = params.sections.reduce((sum, section) => sum + section.bars, 0);
  let steps: SliceCell[] = [];
  for (const section of params.sections) {
    const lane = section.lanes[0];
    steps = steps.concat(lane.steps.map((step) => normalizeCell(step)));
  }
  applyCorpsePass(steps, params.stepsPerBar, params.sections, params.corpseAmount, params.rng);
  applyChokeOverlay(steps, params.stepsPerBar, params.sections, params.chokeAmount, params.rng);
  const signature = seedToNumber(steps.map(stepSignature).join("|"));

  return {
    id: `arc-${params.seed}-${signature}`,
    name: `Arc ${params.seed}`,
    style: "Generative Arc",
    construct: params.curve,
    description: "A seeded groove substrate with ZoC construct deviations over a tension curve.",
    bpm: params.bpm,
    stepsPerBar: params.stepsPerBar,
    bars: totalBars,
    swing: 0,
    loop: false,
    lands: "L",
    lanes: [{ type: "slice", name: "amen arc", steps }],
    notes: params.operators.map((op) => `${op.atBar}: ${op.type}`).join("; "),
  };
}

function applyOperators(sections: ArcSection[], rng: Rng): ArcOperator[] {
  const operators: ArcOperator[] = [];
  for (let i = 1; i < sections.length; i++) {
    const prev = sections[i - 1];
    const next = sections[i];
    const drop = prev.tension - next.tension;
    const rise = next.tension - prev.tension;
    if (drop > 0.28) {
      operators.push({ type: "Stochastic Caesura", atBar: next.startBar, label: "rest-as-overload" });
      clearBoundary(next);
    } else if (rise > 0.25) {
      operators.push({ type: "Threat Meter", atBar: next.startBar, label: "payoff withheld" });
      punishBoundary(next, rng);
    } else if (rng.chance(0.42)) {
      operators.push({ type: "Phrase Debt", atBar: next.startBar, label: "cadence borrowed forward" });
      quoteDebt(prev, next);
    } else if (rng.chance(0.22)) {
      operators.push({ type: "Structural Absence", atBar: next.startBar, label: "established element yanked" });
      clearBoundary(next);
    }
  }
  const last = sections[sections.length - 1];
  if (last) {
    operators.push({
      type: "Reserved Incompletion",
      atBar: last.startBar + last.bars,
      label: "final cadence withheld",
    });
    const lane = last.lanes[0];
    lane.steps.splice(Math.max(0, lane.steps.length - 4), 4, null, null, null, null);
  }
  return operators;
}

function quoteDebt(prev: ArcSection, next: ArcSection): void {
  const prevLane = prev.lanes[0];
  const nextLane = next.lanes[0];
  const phrase = prevLane.steps.slice(Math.max(0, prevLane.steps.length - 4));
  for (let i = 0; i < phrase.length && i + 1 < nextLane.steps.length; i++) {
    const cell = normalizeCell(phrase[i]);
    if (cell) nextLane.steps[i + 1] = { ...cell, gain: (cell.gain ?? 1) * 0.62 };
  }
}

function clearBoundary(section: ArcSection): void {
  const lane = section.lanes[0];
  for (let i = 0; i < Math.min(4, lane.steps.length); i++) lane.steps[i] = null;
}

function punishBoundary(section: ArcSection, rng: Rng): void {
  const lane = section.lanes[0];
  for (let i = 0; i < Math.min(4, lane.steps.length); i++) {
    lane.steps[i] = {
      slice: rng.pick(ROLE_SLICES.clickChoke),
      gain: 0.7,
      gate: 0.028,
      sat: 0.45,
    };
  }
}

function applyCorpsePass(
  steps: SliceCell[],
  stepsPerBar: number,
  sections: readonly ArcSection[],
  amount: number,
  rng: Rng,
): void {
  for (const section of sections) {
    const base = section.startBar * stepsPerBar;
    let previousSlice: number | null = null;
    for (let step = 0; step < section.bars * stepsPerBar; step++) {
      const index = base + step;
      const cell = normalizeCell(steps[index]);
      if (!cell) continue;
      const inBar = step % stepsPerBar;
      const protectedSkeleton = inBar === 0 || inBar === 4 || inBar === 8 || inBar === 12;
      if (protectedSkeleton) {
        previousSlice = cell.slice;
        continue;
      }

      const localCorpse = clamp(amount, 0, 1);
      const role = roleForSlice(cell.slice);
      const pool = role ? ROLE_SLICES[role] : null;
      const successors = previousSlice == null ? [] : NATURAL_SUCCESSORS[previousSlice] ?? [];
      const natural = pool?.filter((slice) => successors.includes(slice)) ?? [];
      const randomize = pool && rng.chance((1 - localCorpse) * 0.58);
      const naturalize = natural.length > 0 && rng.chance(localCorpse * 0.55);

      if (naturalize) {
        cell.slice = rng.pick(natural);
      } else if (randomize) {
        cell.slice = rng.pick(pool);
        cell.gain = (cell.gain ?? 1) * (0.82 + rng.next() * 0.28);
      }
      previousSlice = cell.slice;
    }
  }
}

function applyChokeOverlay(
  steps: SliceCell[],
  stepsPerBar: number,
  sections: readonly ArcSection[],
  amount: number,
  rng: Rng,
): void {
  for (const section of sections) {
    const base = section.startBar * stepsPerBar;
    const density = clamp(amount * (0.35 + section.tension), 0, 0.88);
    for (let step = 0; step < section.bars * stepsPerBar; step++) {
      const inBar = step % stepsPerBar;
      const significant =
        inBar === 3 ||
        inBar === 7 ||
        inBar === 11 ||
        inBar === 15 ||
        (amount > 0.65 && (inBar === 5 || inBar === 13));
      if (!significant || !rng.chance(density)) continue;
      const existing = normalizeCell(steps[base + step]);
      steps[base + step] = {
        slice: rng.pick(rolePool("clickChoke")),
        gain: existing ? Math.max(0.48, (existing.gain ?? 1) * (0.62 + amount * 0.28)) : 0.38,
        gate: 0.018 + amount * 0.018,
        sat: 0.18 + amount * 0.62,
        ratchet: amount > 0.78 && rng.chance(amount * 0.35) ? 2 : 1,
        timing: existing?.timing ?? 0,
      };
    }
  }
}

function roleForSlice(slice: number): SliceRole | null {
  for (const [role, slices] of Object.entries(ROLE_SLICES) as [SliceRole, readonly number[]][]) {
    if (slices.includes(slice)) return role;
  }
  return null;
}

function rolePool(role: SliceRole): readonly number[] {
  return ROLE_SLICES[role];
}
