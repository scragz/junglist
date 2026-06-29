import type { Generator } from "../generator";
import { barStep, cell, makeLane, setStep } from "./helpers";

export const monophonicPolyrhythm: Generator = {
  id: "monophonic-polyrhythm",
  name: "Monophonic Polyrhythm",
  tier: "A",
  style: "Gabber",
  lands: "A",
  naturalBars: [2, 4],
  tensionRange: [0.28, 0.82],
  generate(ctx) {
    const lane = makeLane("monophonic polyrhythm", ctx);
    const shape = ctx.rng.pick([
      [0, 3, 6, 10, 13],
      [0, 5, 7, 11, 14],
      [0, 4, 7, 10, 15],
    ]);
    for (let bar = 0; bar < ctx.bars; bar++) {
      for (const step of shape) {
        const strong = step === 0 || step === 10;
        setStep(
          lane,
          barStep(ctx, bar, step),
          cell(ctx, strong ? "kickHeavy" : "kick", {
            gain: strong ? 0.9 : 0.58,
            gate: 0.052,
          }),
        );
      }
    }
    return [lane];
  },
};
