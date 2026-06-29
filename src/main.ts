import { AudioEngine } from "./engine/audioEngine";
import "./styles.css";
import { renderWorkbench } from "./ui/workbench";

// --- audio assets: amen-01..44.wav, resolved to bundled URLs (spec §1, §5.7) --
const audioModules = import.meta.glob("/audio/amen-*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const audioUrls = Object.entries(audioModules)
  .map(([path, url]) => {
    const m = path.match(/amen-(\d+)\.wav$/);
    return m ? { n: parseInt(m[1], 10), url } : null;
  })
  .filter((x): x is { n: number; url: string } => x !== null)
  .sort((a, b) => a.n - b.n)
  .map((x) => x.url);

// --- page scaffold ------------------------------------------------------------
function buildPage(): void {
  const engine = new AudioEngine(audioUrls);

  const app = document.createElement("div");
  app.className = "app-frame";

  const header = document.createElement("header");
  header.className = "app-header";
  header.innerHTML = `
    <h1>Junglist</h1>
    <p>Generative arc engine for sliced Amen MIDI export.</p>
  `;

  app.appendChild(header);

  const workbench = document.createElement("div");
  app.appendChild(workbench);
  document.body.appendChild(app);

  renderWorkbench(workbench, engine);
}

buildPage();
