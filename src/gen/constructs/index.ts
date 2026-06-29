import { createRegistry } from "../generator";
import { gravitationalLiminality } from "./gravitationalLiminality";
import { metricalGhost } from "./metricalGhost";
import { monophonicPolyrhythm } from "./monophonicPolyrhythm";
import { percussiveOpacity } from "./percussiveOpacity";
import { pocket } from "./pocket";
import { pressurePulse } from "./pressurePulse";
import { structuralAliasing } from "./structuralAliasing";
import { subdividedRelentlessness } from "./subdividedRelentlessness";
import { temporalForeclosure } from "./temporalForeclosure";

export const registry = createRegistry([
  pocket,
  metricalGhost,
  gravitationalLiminality,
  subdividedRelentlessness,
  structuralAliasing,
  temporalForeclosure,
  percussiveOpacity,
  monophonicPolyrhythm,
  pressurePulse,
]);
