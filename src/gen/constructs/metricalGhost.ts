import type { Generator } from "../generator";
import { barStep, cell, density, humanTiming, makeLane, setStep } from "./helpers";

export const metricalGhost: Generator = {
  id: "metrical-ghost",
  name: "Metrical Ghost",
  tier: "A",
  style: "Breaks",
  lands: "L",
  naturalBars: [2, 4],
  tensionRange: [0.2, 0.75],
  generate(ctx) {
    const lane = makeLane("metrical ghost", ctx);
    const fill = density(ctx, 0.35, 0.7);
    for (let bar = 0; bar < ctx.bars; bar++) {
      const hole = barStep(ctx, bar, ctx.rng.pick([0, 8]));
      const anchors = [hole - 3, hole - 2, hole - 1, hole + 1, hole + 2, hole + 3];
      for (const step of anchors) {
        if (ctx.rng.chance(fill)) {
          setStep(
            lane,
            step,
            cell(ctx, ctx.rng.chance(0.45) ? "snareLight" : "hat", {
              gain: 0.42 + ctx.rng.next() * 0.24,
              gate: 0.045,
              timing: humanTiming(ctx, 5),
            }),
          );
        }
      }
      setStep(lane, barStep(ctx, bar, 4), cell(ctx, "snare", { gain: 0.78 }));
      setStep(lane, barStep(ctx, bar, 12), cell(ctx, "rim", { gain: 0.62 }));
    }
    return [lane];
  },
};
