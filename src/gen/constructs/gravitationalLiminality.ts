import type { Generator } from "../generator";
import { barStep, cell, humanTiming, makeLane, setStep } from "./helpers";

export const gravitationalLiminality: Generator = {
  id: "gravitational-liminality",
  name: "Gravitational Liminality",
  tier: "A",
  style: "Steppers",
  lands: "L",
  naturalBars: [3, 5],
  tensionRange: [0.12, 0.58],
  generate(ctx) {
    const lane = makeLane("gravitational liminality", ctx);
    for (let bar = 0; bar < ctx.bars; bar++) {
      for (const step of [2, 6, 10, 14]) {
        setStep(
          lane,
          barStep(ctx, bar, step),
          cell(ctx, ctx.rng.chance(0.6) ? "hatLight" : "rim", {
            gain: 0.35 + ctx.intensity * 0.28,
            gate: 0.035,
            timing: humanTiming(ctx, 4),
          }),
        );
      }
      setStep(lane, barStep(ctx, bar, 4), cell(ctx, "snareLight", { gain: 0.55 }));
      if (ctx.rng.chance(0.55)) {
        setStep(lane, barStep(ctx, bar, 15), cell(ctx, "flam", { gain: 0.5 }));
      }
    }
    return [lane];
  },
};
