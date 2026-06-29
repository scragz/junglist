import type { Generator } from "../generator";
import { barStep, cell, humanTiming, makeLane, setStep } from "./helpers";

export const temporalForeclosure: Generator = {
  id: "temporal-foreclosure",
  name: "Temporal Foreclosure",
  tier: "A",
  style: "Footwork",
  lands: "L",
  naturalBars: [4, 7],
  tensionRange: [0.35, 0.9],
  generate(ctx) {
    const lane = makeLane("temporal foreclosure", ctx);
    const turn = Math.max(1, Math.floor(ctx.bars * 0.45));
    for (let bar = 0; bar < ctx.bars; bar++) {
      const clear = bar < turn;
      const kicks = clear ? [0, 8] : [1, 6, 11, 15];
      const snares = clear ? [4, 12] : [3, 9, 14];
      for (const step of kicks) {
        setStep(
          lane,
          barStep(ctx, bar, step),
          cell(ctx, clear ? "kickHeavy" : "kick", {
            gain: clear ? 0.82 : 0.62,
            timing: clear ? 0 : humanTiming(ctx, 8),
          }),
        );
      }
      for (const step of snares) {
        setStep(lane, barStep(ctx, bar, step), cell(ctx, "snare", { gain: clear ? 0.74 : 0.58 }));
      }
      if (!clear) {
        for (const step of [5, 7, 10, 13]) {
          if (ctx.rng.chance(0.45 + ctx.intensity * 0.25)) {
            setStep(lane, barStep(ctx, bar, step), cell(ctx, "hatLight", { gain: 0.38 }));
          }
        }
      }
    }
    return [lane];
  },
};
