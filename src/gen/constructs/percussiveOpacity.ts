import type { Generator } from "../generator";
import { barStep, cell, density, humanTiming, makeLane, setStep } from "./helpers";

export const percussiveOpacity: Generator = {
  id: "percussive-opacity",
  name: "Percussive Opacity",
  tier: "A",
  style: "Gabber",
  lands: "L",
  naturalBars: [1, 3],
  tensionRange: [0.68, 1],
  generate(ctx) {
    const lane = makeLane("percussive opacity", ctx);
    const fill = density(ctx, 0.78, 0.96);
    for (let bar = 0; bar < ctx.bars; bar++) {
      for (let step = 0; step < ctx.stepsPerBar; step++) {
        if (!ctx.rng.chance(fill) && step % 4 !== 0) continue;
        setStep(
          lane,
          barStep(ctx, bar, step),
          cell(ctx, ctx.rng.chance(0.35) ? "clickChoke" : ctx.rng.chance(0.5) ? "snare" : "hat", {
            gain: step % 4 === 0 ? 0.86 : 0.46 + ctx.rng.next() * 0.38,
            gate: 0.018 + ctx.rng.next() * 0.03,
            sat: 0.35 + ctx.intensity * 0.45,
            timing: humanTiming(ctx, 3),
          }),
        );
      }
    }
    return [lane];
  },
};
