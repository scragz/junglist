import type { AudioEngine } from "../engine/audioEngine";
import { buildPatternFromSections, composeArc, renderSection, type Arc, type ArcSection } from "../gen/composer";
import { registry } from "../gen/constructs";
import type { GeneratorId, PaletteId } from "../gen/generator";
import { createRng, seedToNumber } from "../gen/rng";
import { downloadPatternMidi } from "../midi/export";
import { renderInspector } from "./inspector";
import { renderLineage, type LineageItem } from "./lineage";
import { renderTransport } from "./transport";

type SlotId = "A" | "B" | "C";

const SLOT_IDS: readonly SlotId[] = ["A", "B", "C"];
const PALETTES: readonly PaletteId[] = ["Breaks", "Footwork", "Gabber", "Steppers", "Power Noise"];

interface WorkbenchState {
  slots: Record<SlotId, Arc>;
  focus: SlotId;
  selectedSection: number;
  seed: number;
  intensity: number;
  length: number;
  corpse: number;
  choke: number;
  palettes: Set<PaletteId>;
  lineage: LineageItem[];
  playing: boolean;
  stopWaveform?: () => void;
}

export function renderWorkbench(root: HTMLElement, engine: AudioEngine): void {
  const initialSeed = seedToNumber(Date.now()) % 100000;
  const state: WorkbenchState = {
    slots: {
      A: composeArc({ seed: initialSeed, intensityBias: 0.55, lengthBias: 0.48 }),
      B: composeArc({ seed: initialSeed + 101, intensityBias: 0.5, lengthBias: 0.42 }),
      C: composeArc({ seed: initialSeed + 202, intensityBias: 0.62, lengthBias: 0.5 }),
    },
    focus: "A",
    selectedSection: 0,
    seed: initialSeed,
    intensity: 0.55,
    length: 0.48,
    corpse: 0.55,
    choke: 0.18,
    palettes: new Set(PALETTES),
    lineage: [],
    playing: false,
  };

  const rerender = () => {
    state.stopWaveform?.();
    state.stopWaveform = undefined;
    root.replaceChildren(buildWorkbench(state, engine, rerender));
  };
  rerender();
}

function buildWorkbench(
  state: WorkbenchState,
  engine: AudioEngine,
  rerender: () => void,
): HTMLElement {
  const arc = state.slots[state.focus];
  const shell = document.createElement("main");
  shell.className = "arc-shell";

  shell.appendChild(
    renderTransport(
      {
        playing: state.playing,
        bpm: arc.pattern.bpm,
        bars: arc.pattern.bars,
        focus: state.focus,
      },
      {
        onPlayStop: () => {
          if (state.playing) {
            engine.stopAll();
            state.playing = false;
            rerender();
            return;
          }
          void engine.play(arc.pattern, () => {
            state.playing = false;
            rerender();
          });
          state.playing = true;
          rerender();
        },
        onFocus: (slot) => {
          state.focus = slot;
          state.selectedSection = 0;
          state.seed = state.slots[slot].seed;
          rerender();
        },
        onExport: () => downloadPatternMidi(arc.pattern, arc.seed),
      },
    ),
  );

  const hero = document.createElement("section");
  hero.className = "arc-hero";
  hero.appendChild(renderCurve(arc.tensionPoints));
  hero.appendChild(renderTimeline(state, rerender));
  hero.appendChild(renderUnderlay(state));
  hero.appendChild(renderCompareStrips(state, engine, rerender));
  shell.appendChild(hero);

  const waveform = document.createElement("canvas");
  waveform.className = "arc-waveform";
  waveform.dataset.waveform = "true";
  shell.appendChild(waveform);

  const selected = arc.sections[state.selectedSection] ?? null;
  shell.appendChild(
    renderInspector(selected, {
      onSwap: (generatorId) => {
        if (!selected) return;
        applyLiveArcEdit(state, engine, rerender, () => {
          replaceSection(state, generatorId, selected.bars);
        });
      },
      onDensity: (value) => {
        if (!selected) return;
        applyLiveArcEdit(state, engine, rerender, () => {
          selected.knobs.density = value;
          replaceSection(state, selected.generatorId, selected.bars, selected.knobs);
        });
      },
      onLength: (bars) => {
        if (!selected) return;
        applyLiveArcEdit(state, engine, rerender, () => {
          replaceSection(state, selected.generatorId, bars, selected.knobs);
        });
      },
      onLock: () => {
        if (!selected) return;
        selected.locked = !selected.locked;
        rerender();
      },
    }),
  );

  shell.appendChild(renderGenerationBar(state, engine, rerender));
  shell.appendChild(
    renderLineage(state.lineage, {
      onRecall: (index) => {
        const item = state.lineage[index];
        if (!item) return;
        state.lineage.unshift({ arc: state.slots[state.focus], kept: false });
        state.slots[state.focus] = item.arc;
        state.seed = item.arc.seed;
        state.selectedSection = 0;
        rerender();
      },
      onKeep: (index) => {
        const item = state.lineage[index];
        if (item) item.kept = !item.kept;
        rerender();
      },
    }),
  );

  requestAnimationFrame(() => {
    const canvas = shell.querySelector<HTMLCanvasElement>("[data-waveform]");
    if (canvas) {
      import("./waveform").then(({ startWaveform }) => {
        state.stopWaveform = startWaveform(engine.analyser, canvas);
      });
    }
  });

  return shell;
}

function renderTimeline(state: WorkbenchState, rerender: () => void): HTMLElement {
  const arc = state.slots[state.focus];
  const total = Math.max(1, arc.pattern.bars);
  const wrap = document.createElement("div");
  wrap.className = "arc-timeline";
  for (let index = 0; index < arc.sections.length; index++) {
    const section = arc.sections[index];
    const block = document.createElement("button");
    block.className = `section-block style-${section.style.toLowerCase().replace(/[^a-z]+/g, "-")} ${
      state.selectedSection === index ? "is-selected" : ""
    }`;
    block.style.flexGrow = String(section.bars / total);
    block.title = `${section.name}: ${section.bars} bars`;
    block.addEventListener("click", () => {
      state.selectedSection = index;
      rerender();
    });
    block.innerHTML = `<span>${shortName(section.name)}</span><strong>${section.bars}${section.locked ? " 🔒" : ""}</strong>`;
    wrap.appendChild(block);

    const op = arc.operators.find((operator) => operator.atBar === section.startBar + section.bars);
    if (op && index < arc.sections.length - 1) {
      const marker = document.createElement("span");
      marker.className = "operator-marker";
      marker.textContent = "◇";
      marker.title = `${op.type}: ${op.label}`;
      wrap.appendChild(marker);
    }
  }
  return wrap;
}

function renderCurve(points: readonly number[]): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 24");
  svg.classList.add("tension-curve");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const d = points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 100;
      const y = 22 - point * 20;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  path.setAttribute("d", d);
  svg.appendChild(path);
  return svg;
}

function renderUnderlay(state: WorkbenchState): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "tier-c-underlay";
  wrap.textContent = `corpse-meter ${bars(state.corpse)}   choke ${bars(state.choke)}`;
  return wrap;
}

function renderCompareStrips(
  state: WorkbenchState,
  engine: AudioEngine,
  rerender: () => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "compare-strips";
  for (const slot of SLOT_IDS.filter((id) => id !== state.focus)) {
    const arc = state.slots[slot];
    const strip = document.createElement("button");
    strip.className = "compare-strip";
    strip.innerHTML = `<strong>${slot}</strong><span>${spark(arc.tensionPoints)}</span><em>${arc.seed}</em>`;
    strip.addEventListener("click", () => {
      state.focus = slot;
      state.selectedSection = 0;
      rerender();
    });
    const solo = document.createElement("button");
    solo.className = "btn btn-xs btn-ghost";
    solo.textContent = "solo";
    solo.addEventListener("click", (event) => {
      event.stopPropagation();
      void engine.play(arc.pattern);
    });
    const row = document.createElement("div");
    row.className = "compare-row";
    row.appendChild(strip);
    row.appendChild(solo);
    wrap.appendChild(row);
  }
  return wrap;
}

function renderGenerationBar(
  state: WorkbenchState,
  engine: AudioEngine,
  rerender: () => void,
): HTMLElement {
  const wrap = document.createElement("section");
  wrap.className = "generation-bar";
  const actions = document.createElement("div");
  actions.className = "generation-actions";
  const controls = document.createElement("div");
  controls.className = "generation-controls";

  const roll = document.createElement("button");
  roll.className = "btn btn-sm btn-primary";
  roll.textContent = `Roll → ${state.focus}`;
  roll.addEventListener("click", () => {
    pushLineage(state);
    const seed = randomSeed();
    state.seed = seed;
    installFocusedArc(state, engine, rerender, composeCurrent(state, undefined, seed));
  });
  actions.appendChild(roll);

  const reroll = document.createElement("button");
  reroll.className = "btn btn-sm btn-outline";
  reroll.textContent = "Re-roll unlocked";
  reroll.addEventListener("click", () => {
    pushLineage(state);
    const seed = randomSeed();
    state.seed = seed;
    installFocusedArc(state, engine, rerender, composeCurrent(state, state.slots[state.focus], seed));
  });
  actions.appendChild(reroll);

  const mutate = document.createElement("button");
  mutate.className = "btn btn-sm btn-outline";
  mutate.textContent = "Mutate";
  mutate.addEventListener("click", () => {
    pushLineage(state);
    const seed = nearbySeed(state.slots[state.focus].seed);
    state.seed = seed;
    installFocusedArc(state, engine, rerender, mutateFocusedArc(state, seed));
  });
  actions.appendChild(mutate);

  const nextControls = document.createElement("div");
  nextControls.className = "control-cluster";
  nextControls.appendChild(clusterLabel("next roll"));
  nextControls.appendChild(numberField("seed", state.seed, (value) => {
    state.seed = Math.max(1, Math.round(value));
  }));
  nextControls.appendChild(rangeField("bars", state.length, (value) => {
    state.length = value;
    rerender();
  }, "change", "Next roll length bias. Higher values produce longer arcs/sections."));
  nextControls.appendChild(rangeField("chaos", state.intensity, (value) => {
    state.intensity = value;
    rerender();
  }, "change", "Next roll tension bias. Higher values choose more disruptive construct sections."));
  controls.appendChild(nextControls);

  const liveControls = document.createElement("div");
  liveControls.className = "control-cluster";
  liveControls.appendChild(clusterLabel("live"));
  liveControls.appendChild(rangeField("corpse", state.corpse, (value) => {
    applyLiveArcEdit(state, engine, rerender, () => {
      state.corpse = value;
      recalcArc(state);
    });
  }, "change", "Source-order bias. Low randomizes slice choices; high preserves natural Amen successors."));
  liveControls.appendChild(rangeField("choke", state.choke, (value) => {
    applyLiveArcEdit(state, engine, rerender, () => {
      state.choke = value;
      recalcArc(state);
    });
  }, "change", "Click/choke overlay amount on syncopated positions."));
  controls.appendChild(liveControls);

  const palettes = document.createElement("div");
  palettes.className = "palette-toggles";
  for (const palette of PALETTES) {
    const button = document.createElement("button");
    button.className = `btn btn-xs ${state.palettes.has(palette) ? "btn-secondary" : "btn-ghost"}`;
    button.textContent = palette.split(" ")[0];
    button.addEventListener("click", () => {
      if (state.palettes.has(palette) && state.palettes.size > 1) state.palettes.delete(palette);
      else state.palettes.add(palette);
      rerender();
    });
    palettes.appendChild(button);
  }
  wrap.appendChild(actions);
  wrap.appendChild(controls);
  wrap.appendChild(palettes);

  return wrap;
}

function composeCurrent(state: WorkbenchState, previous?: Arc, seed = state.seed): Arc {
  return composeArc({
    seed,
    intensityBias: state.intensity,
    lengthBias: state.length,
    corpseAmount: state.corpse,
    chokeAmount: state.choke,
    palettes: [...state.palettes],
    previous,
  });
}

function mutateFocusedArc(state: WorkbenchState, seed: number): Arc {
  const arc = state.slots[state.focus];
  let startBar = 0;
  const sections = arc.sections.map((section, index) => {
    if (section.locked) {
      const locked = cloneSectionForUi(section);
      locked.startBar = startBar;
      startBar += locked.bars;
      return locked;
    }
    const next = renderSection({
      seed: seed + index * 37,
      generatorId: section.generatorId,
      bars: section.bars,
      tension: section.tension,
      bpm: arc.pattern.bpm,
      stepsPerBar: arc.pattern.stepsPerBar,
      startBar,
      locked: section.locked,
      knobs: { ...section.knobs },
    });
    next.startBar = startBar;
    startBar += next.bars;
    return next;
  });
  const pattern = buildPatternFromSections({
    seed,
    bpm: arc.pattern.bpm,
    stepsPerBar: arc.pattern.stepsPerBar,
    curve: arc.curve,
    sections,
    operators: arc.operators,
    corpseAmount: state.corpse,
    chokeAmount: state.choke,
    rng: createRng(`${seed}:mutate`),
  });
  return { ...arc, seed, sections, pattern };
}

function cloneSectionForUi(section: ArcSection): ArcSection {
  return {
    ...section,
    knobs: { ...section.knobs },
    lanes: section.lanes.map((lane) => ({
      ...lane,
      steps: lane.steps.map((step) => {
        if (step == null || step === 0) return null;
        return typeof step === "number" ? { slice: step } : { ...step };
      }),
    })),
  };
}

function replaceSection(
  state: WorkbenchState,
  generatorId: GeneratorId,
  bars: number,
  knobs: ArcSection["knobs"] = {},
): void {
  const arc = state.slots[state.focus];
  const old = arc.sections[state.selectedSection];
  if (!old) return;
  const generator = registry.byId(generatorId);
  const section = renderSection({
    seed: state.seed + state.selectedSection * 997,
    generatorId: generator.id,
    bars: Math.max(1, Math.min(8, bars)),
    tension: old.tension,
    bpm: arc.pattern.bpm,
    stepsPerBar: arc.pattern.stepsPerBar,
    startBar: old.startBar,
    locked: old.locked,
    knobs,
  });
  section.style = generator.style;
  arc.sections[state.selectedSection] = section;
  recalcArc(state);
}

function recalcArc(state: WorkbenchState): void {
  const arc = state.slots[state.focus];
  let start = 0;
  for (const section of arc.sections) {
    section.startBar = start;
    start += section.bars;
  }
  arc.pattern = buildPatternFromSections({
    seed: arc.seed,
    bpm: arc.pattern.bpm,
    stepsPerBar: arc.pattern.stepsPerBar,
    curve: arc.curve,
    sections: arc.sections,
    operators: arc.operators,
    corpseAmount: state.corpse,
    chokeAmount: state.choke,
    rng: createRng(`${arc.seed}:rebuild`),
  });
}

function applyLiveArcEdit(
  state: WorkbenchState,
  engine: AudioEngine,
  rerender: () => void,
  update: () => void,
): void {
  const wasPlaying = state.playing;
  if (wasPlaying) engine.stopAll();
  update();
  if (wasPlaying) {
    const arc = state.slots[state.focus];
    void engine.play(arc.pattern, () => {
      state.playing = false;
      rerender();
    });
    state.playing = true;
  }
  rerender();
}

function installFocusedArc(
  state: WorkbenchState,
  engine: AudioEngine,
  rerender: () => void,
  arc: Arc,
): void {
  applyLiveArcEdit(state, engine, rerender, () => {
    state.slots[state.focus] = arc;
    state.selectedSection = 0;
  });
}

function randomSeed(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 99999) + 1;
}

function nearbySeed(seed: number): number {
  const delta = Math.floor(Math.random() * 99) - 49 || 7;
  return ((seed + delta + 99999) % 99999) + 1;
}

function clusterLabel(text: string): HTMLElement {
  const label = document.createElement("span");
  label.className = "cluster-label";
  label.textContent = text;
  return label;
}

function pushLineage(state: WorkbenchState): void {
  state.lineage.unshift({ arc: state.slots[state.focus], kept: false });
  state.lineage = state.lineage.slice(0, 24);
}

function shortName(name: string): string {
  return name
    .split(" ")
    .map((part) => part.slice(0, 5))
    .join(" ");
}

function bars(value: number): string {
  const count = Math.round(value * 18);
  return `${"▰".repeat(count)}${"▱".repeat(Math.max(0, 18 - count))}`;
}

function spark(points: readonly number[]): string {
  const chars = "▁▂▃▄▅▆▇";
  return points
    .filter((_, index) => index % 5 === 0)
    .map((point) => chars[Math.max(0, Math.min(chars.length - 1, Math.round(point * (chars.length - 1))))])
    .join("");
}

function numberField(label: string, value: number, onChange: (value: number) => void): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "gen-field";
  const span = document.createElement("span");
  span.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.className = "input input-sm input-bordered w-20";
  input.value = String(value);
  input.addEventListener("change", () => onChange(Number(input.value)));
  wrap.appendChild(span);
  wrap.appendChild(input);
  return wrap;
}

function rangeField(
  label: string,
  value: number,
  onInput: (value: number) => void,
  eventName: "input" | "change" = "input",
  title?: string,
): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "gen-field";
  const span = document.createElement("span");
  span.textContent = label;
  if (title) wrap.title = title;
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "100";
  input.value = String(Math.round(value * 100));
  input.className = "range range-xs range-secondary";
  input.addEventListener(eventName, () => onInput(Number(input.value) / 100));
  wrap.appendChild(span);
  wrap.appendChild(input);
  return wrap;
}
