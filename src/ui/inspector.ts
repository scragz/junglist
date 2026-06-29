import type { ArcSection } from "../gen/composer";
import { registry } from "../gen/constructs";
import type { GeneratorId } from "../gen/generator";

export interface InspectorActions {
  onSwap: (generatorId: GeneratorId) => void;
  onDensity: (value: number) => void;
  onLength: (bars: number) => void;
  onLock: () => void;
}

export function renderInspector(
  section: ArcSection | null,
  actions: InspectorActions,
): HTMLElement {
  const wrap = document.createElement("aside");
  wrap.className = "arc-inspector";
  if (!section) {
    wrap.textContent = "Select a section";
    return wrap;
  }

  const title = document.createElement("div");
  title.className = "inspector-title";
  title.textContent = `${section.name} · ${section.bars} bars`;
  wrap.appendChild(title);

  const controls = document.createElement("div");
  controls.className = "inspector-controls";

  const select = document.createElement("select");
  select.className = "select select-sm select-bordered";
  for (const generator of registry.all) {
    const option = document.createElement("option");
    option.value = generator.id;
    option.textContent = generator.name;
    option.selected = generator.id === section.generatorId;
    select.appendChild(option);
  }
  select.addEventListener("change", () => actions.onSwap(select.value as GeneratorId));
  controls.appendChild(labelWrap("swap", select));

  const density = document.createElement("input");
  density.type = "range";
  density.min = "0";
  density.max = "100";
  density.value = String(Math.round((section.knobs.density ?? section.tension) * 100));
  density.className = "range range-sm range-primary";
  density.disabled = section.generatorId === "pocket";
  if (density.disabled) density.title = "Pocket sections are the clean groove substrate.";
  density.addEventListener("change", () => actions.onDensity(Number(density.value) / 100));
  controls.appendChild(labelWrap("density", density));

  const length = document.createElement("input");
  length.type = "number";
  length.min = "1";
  length.max = "8";
  length.value = String(section.bars);
  length.className = "input input-sm input-bordered w-20";
  length.addEventListener("change", () => actions.onLength(Math.max(1, Number(length.value) || 1)));
  controls.appendChild(labelWrap("len", length));

  const lock = document.createElement("button");
  lock.className = `btn btn-sm ${section.locked ? "btn-warning" : "btn-outline"}`;
  lock.textContent = section.locked ? "Locked" : "Lock";
  lock.addEventListener("click", actions.onLock);
  controls.appendChild(lock);

  wrap.appendChild(controls);
  return wrap;
}

function labelWrap(label: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "inspector-field";
  const span = document.createElement("span");
  span.textContent = label;
  wrap.appendChild(span);
  wrap.appendChild(control);
  return wrap;
}
