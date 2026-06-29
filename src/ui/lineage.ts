import type { Arc } from "../gen/composer";

export interface LineageItem {
  arc: Arc;
  kept: boolean;
}

export interface LineageActions {
  onRecall: (index: number) => void;
  onKeep: (index: number) => void;
}

export function renderLineage(
  items: readonly LineageItem[],
  actions: LineageActions,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "lineage";
  const label = document.createElement("span");
  label.className = "lineage-label";
  label.textContent = "LINEAGE";
  wrap.appendChild(label);

  for (let i = 0; i < Math.min(12, items.length); i++) {
    const item = items[i];
    const button = document.createElement("button");
    button.className = `lineage-chip ${item.kept ? "is-kept" : ""}`;
    button.textContent = `${item.kept ? "★" : "·∿·"} ${item.arc.seed}`;
    button.addEventListener("click", () => actions.onRecall(i));
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      actions.onKeep(i);
    });
    wrap.appendChild(button);
  }
  return wrap;
}
