import type { Generator } from "../generator";
import { makeLane } from "./helpers";

export const pocket: Generator = {
  id: "pocket",
  name: "Pocket",
  tier: "A",
  style: "Breaks",
  lands: "L",
  naturalBars: [2, 4],
  tensionRange: [0, 0.32],
  generate(ctx) {
    return [makeLane("pocket", ctx)];
  },
};
