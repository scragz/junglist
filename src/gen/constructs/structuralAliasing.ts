import type { Generator } from "../generator";
import { barStep, cell, density, makeLane, setStep } from "./helpers";

export const structuralAliasing: Generator = {
  id: "structural-aliasing",
  name: "Structural Aliasing",
  tier: "A",
  style: "Steppers",
  lands: "L",
  naturalBars: [2, 4],
  tensionRange: [0.55, 1],
  generate(ctx) {
    const lane = makeLane("structural aliasing", ctx);
    const fill = density(ctx, 0.72, 0.93);
    for (let bar = 0; bar < ctx.bars; bar++) {
      for (let step = 0; step < ctx.stepsPerBar; step++) {
        if (!ctx.rng.chance(fill) && step % 4 !== 0) continue;
        const role = step % 4 === 0 ? "kickHeavy" : ctx.rng.chance(0.55) ? "hat" : "snareLight";
        setStep(
          lane,
          barStep(ctx, bar, step),
          cell(ctx, role, {
            gain: step % 4 === 0 ? 0.82 : 0.38 + ctx.rng.next() * 0.32,
            gate: 0.026 + ctx.rng.next() * 0.025,
            ratchet: ctx.rng.chance(0.22 + ctx.intensity * 0.18) ? 2 : 1,
          }),
        );
      }
    }
    return [lane];
  },
};
