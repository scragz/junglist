import type { Generator } from "../generator";
import { barStep, cell, humanTiming, makeLane, setStep } from "./helpers";

export const pressurePulse: Generator = {
  id: "pressure-pulse",
  name: "Pressure Pulse",
  tier: "A",
  style: "Power Noise",
  lands: "A",
  naturalBars: [2, 5],
  tensionRange: [0.5, 1],
  generate(ctx) {
    const lane = makeLane("pressure pulse", ctx);
    for (let bar = 0; bar < ctx.bars; bar++) {
      const drift = Math.round((bar / Math.max(1, ctx.bars - 1)) * 3);
      for (let step = 0; step < ctx.stepsPerBar; step++) {
        const directed = (step + drift) % 4 === 0 || (step + drift) % 7 === 0;
        if (!directed && !ctx.rng.chance(0.35 + ctx.intensity * 0.22)) continue;
        setStep(
          lane,
          barStep(ctx, bar, step),
          cell(ctx, directed ? "snare" : ctx.rng.chance(0.5) ? "hatLight" : "clickChoke", {
            gain: directed ? 0.72 : 0.36,
            gate: 0.02 + ctx.rng.next() * 0.04,
            sat: directed ? 0.28 : 0.18,
            timing: humanTiming(ctx, directed ? 9 : 13),
          }),
        );
      }
    }
    return [lane];
  },
};
