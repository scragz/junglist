import type { Generator } from "../generator";
import { barStep, cell, makeLane, setStep } from "./helpers";

export const subdividedRelentlessness: Generator = {
  id: "subdivided-relentlessness",
  name: "Subdivided Relentlessness",
  tier: "A",
  style: "Steppers",
  lands: "L",
  naturalBars: [4, 8],
  tensionRange: [0.35, 0.92],
  generate(ctx) {
    const lane = makeLane("subdivided relentlessness", ctx);
    const base = Array.from({ length: ctx.stepsPerBar }, (_, step) => {
      if (step % 4 === 0) return cell(ctx, step === 0 ? "kickHeavy" : "snare", { gain: 0.82 });
      if (step % 2 === 0) return cell(ctx, "hat", { gain: 0.56, gate: 0.045 });
      return cell(ctx, "hatLight", { gain: 0.34, gate: 0.03 });
    });
    for (let bar = 0; bar < ctx.bars; bar++) {
      for (let step = 0; step < ctx.stepsPerBar; step++) {
        const clone = { ...base[step] };
        if (ctx.rng.chance(0.08)) clone.gain = (clone.gain ?? 1) * (0.8 + ctx.rng.next() * 0.3);
        setStep(lane, barStep(ctx, bar, step), clone);
      }
    }
    return [lane];
  },
};
