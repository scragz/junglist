export interface TransportState {
  playing: boolean;
  bpm: number;
  bars: number;
  focus: "A" | "B" | "C";
}

export interface TransportActions {
  onPlayStop: () => void;
  onFocus: (slot: "A" | "B" | "C") => void;
  onExport: () => void;
}

export function renderTransport(
  state: TransportState,
  actions: TransportActions,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "arc-transport";

  const play = document.createElement("button");
  play.className = `btn btn-sm ${state.playing ? "btn-error" : "btn-primary"}`;
  play.textContent = state.playing ? "Stop" : "Play";
  play.addEventListener("click", actions.onPlayStop);
  wrap.appendChild(play);

  const meta = document.createElement("div");
  meta.className = "transport-meta";
  meta.textContent = `${state.bpm} BPM · ${state.bars} bars · sliced Simpler C1`;
  wrap.appendChild(meta);

  const slots = document.createElement("div");
  slots.className = "join";
  for (const slot of ["A", "B", "C"] as const) {
    const button = document.createElement("button");
    button.className = `btn btn-sm join-item ${state.focus === slot ? "btn-secondary" : "btn-ghost"}`;
    button.textContent = slot;
    button.addEventListener("click", () => actions.onFocus(slot));
    slots.appendChild(button);
  }
  wrap.appendChild(slots);

  const exportButton = document.createElement("button");
  exportButton.className = "btn btn-sm btn-accent";
  exportButton.textContent = "MIDI";
  exportButton.addEventListener("click", actions.onExport);
  wrap.appendChild(exportButton);

  return wrap;
}
