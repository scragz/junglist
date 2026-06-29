# Generative Arc Engine — Plan

Turning the ZoC constructs into a nondeterministic break generator that rides on the
existing web app and exports MIDI for Ableton. **Plan only — no code yet.**

---

## 0. The core bet

Every ZoC construct in `docs/` is already written as **a rule + its failure mode**.
Metrical Ghost *is* "withhold the strong beat, cluster density around the hole —
collapses if density goes too high or too low." That shape — a generative rule plus
the exact condition under which it stops working — is a **parametric generator with a
built-in guardrail**. The failure mode is what keeps nondeterminism from turning to
mush: it's the clamp on the random ranges. We're not bolting safety rails onto chaos;
the docs already specified them.

Three consequences fall out of this:

1. We don't write "a jungle randomizer." We write ~15 small generators, each faithful
   to one construct's mechanism, each refusing to exceed its own collapse threshold.
2. The hand-authored `patterns/*.json` become **reference renderings** — the canonical
   "this is what construct N sounds like when it lands." Generators generalize them;
   they also serve as regression fixtures and as the `L/A/G` ground truth.
3. "An arc, not a track" becomes a **sequencing problem over construct-instances**, not
   a composition problem. We're arranging rules, not bars.

---

## 0.5 Course-correction: groove-first (the constructs are spices, not the dish)

**Symptom:** an arc built only from constructs sounds like frantic jazz drums — all
density, no pocket, never lands a groove.

**Diagnosis:** nearly every ZoC construct is a **destabilizer** — a mechanism for
exceeding the listener's tracking threshold (Structural Aliasing, Temporal Foreclosure,
Stochastic Caesura, Percussive Opacity, Pressure Pulse, Subdivided Relentlessness…). The
original §0 bet — "an arc is a sequence of constructs" — therefore composes an arc
entirely out of figure with no ground. Groove is a **figure/ground relation**: a stable,
funky backbone (the Amen's inherent Stubblefield/Coleman pocket — kick on 1, snare on 2
and 4, swung ghost-hats) under the chopped chaos. The docs only ever described the
figures. We never built the ground. `breaks.md` even names the two groove principles —
**Variant Economy** (groove from minimal edit) and **Phrase Gravity** (the pull toward
the 1) — and *discards* both as "technique, not structure." For a groove engine that's
exactly backwards: those two are the engine.

**Two mechanical compounders:**
- Role-based random slice selection erases the **kick-snare skeleton** the ear locks to.
- F-6's "timing offsets" as corpse-*jitter* ≠ groove. Groove is **consistent**
  displacement (laid-back snare, pushed hats) applied uniformly — a pocket, not noise.

**The reframe (supersedes §0 consequence 3):** the default state of an arc is a
**groove substrate**, not a construct. Constructs are demoted to **operators that deviate
from the pocket and resolve back to it.**

| | Old plan | Corrected |
|---|---|---|
| Default content | a construct | the **pocket** (mostly-intact swung Amen) |
| Constructs are | the material | **departures** from the pocket, then release |
| Skeleton | randomized by role | **protected**; violated only deliberately |
| Timing | corpse-jitter | a **groove template** (consistent swing/pocket) + small jitter |
| Tension curve | peaks only → frantic | **troughs (grounded) ↔ peaks (chaos)** — contrast is the point |

### The groove substrate (the new ground layer)

A first-class layer every arc rides on, before any construct touches it:

1. **Canonical Amen backbone** — the actual recognizable sequence (the famous bar), kept
   mostly intact, with the kick/snare skeleton on protected steps. This is what makes it
   *jungle* and not a fill.
2. **Groove template** — a consistent micro-timing + accent pocket (swing on the
   off-16ths, laid-back snare), applied uniformly so it feels played, not jittered.
3. **Two groove generators promoted from the discard pile:**
   - **Variant Economy** — produce the next bar by *minimal edit* of the current one
     (flip one snare, add one 16th, drop one kick), never wholesale replacement. This is
     the actual groove-evolution motor.
   - **Phrase Gravity** — accumulate expectation across the bar/4-bar cycle and discharge
     it on the 1. Gives the arc a pulse to breathe against.

Constructs (§4) now run **on top of** this: a section is "pocket + this construct's
deviation, for N bars." High-intensity arc positions let the construct overrun the
pocket; low-intensity positions let the pocket play nearly clean. That oscillation is the
groove.

---

## 1. What we reuse (most of it)

The existing engine already does the hard real-time work. The key realization:

> **An arc is just a `Pattern`** with `bars = Σ(section bars)` and `loop: false`.

`PatternPlayer` already schedules multi-bar non-looping patterns to completion and
fires `onEnded`. The waveform, the buffer pool, the gallery card, mutual-exclusion —
all reused untouched. So **generators emit the existing `Pattern` type**, and the
entire playback/preview path is free.

| Existing piece | Reused as-is? | Note |
|---|---|---|
| `Pattern` / `Lane` / cell types | ✅ | The arc is a `Pattern`. No schema change needed. |
| `PatternPlayer` | ✅ | Plays a 24-bar `loop:false` arc identically to a 2-bar loop. |
| `BufferPool` | ✅ | Already loads & clamps to all 44 slices. Comments say "16" — stale, ignore. |
| `validatePattern` | ✅ | No slice-range cap; 44 passes. |
| `gallery.ts` card | ❌ dropped | Cards are a museum; we want an instrument. See §8. The construct browser is repurposed as a section-swap picker. |
| `waveform.ts` | ✅ | Preview works through the shared analyser; now sits under the timeline. |

**Stale references to clean up (cosmetic):** `bufferPool.ts` header + `get()` JSDoc say
"16"; `types.ts` says "slice 1–16". And `docs/sequencer-spec.md` is cited across the
engine but doesn't exist in the repo — worth either writing it or dropping the `§`
references. None block this work.

---

## 2. New surfaces (only four)

```
src/
  gen/
    roles.ts          # slice-role vocabulary (parsed/derived from amen-samples.md)
    rng.ts            # seeded PRNG (mulberry32 / xoshiro) — reproducible arcs
    groove.ts         # the substrate: canonical Amen backbone + swing/pocket template
                      #   + Variant Economy + Phrase Gravity (§0.5). The DEFAULT layer.
    generator.ts      # Generator interface + registry
    constructs/*.ts   # one file per construct — deviation operators over the pocket
    composer.ts       # arc = pocket + a sequence of deviations over a tension curve
  midi/
    smf.ts            # Standard MIDI File encoder (drums + sub tracks)
    export.ts         # Pattern → SMF bytes → Blob download
  ui/
    workbench.ts      # the arc timeline (hero) — sections, tension curve, playhead
    inspector.ts      # selected-section panel: construct swap + guardrail knobs
    lineage.ts        # roll history rail — curated possibilities in time, not a card wall
    transport.ts      # play/stop/scrub/loop-section, BPM, export
```

Everything else stays. No backend; still a static Vite build → Cloudflare.

---

## 3. The slice-role vocabulary (`roles.ts`)

`amen-samples.md` already labels all 44 slices. We lift that into a role map so
generators ask for *a kick* or *a ghost hat*, not slice #23. This is where timbral
intent lives and where construct logic stays readable.

Rough buckets (to be tuned against the actual WAVs):

| Role | Slices (from the doc) | Used by |
|---|---|---|
| `kickHeavy` | 1, 2, 30, 42 (big hits) | downbeats, Gravitational Liminality target |
| `kick` | 8, 12, 13, 23, 24, 35 | Monophonic Polyrhythm, pulse beds |
| `snare` | 5, 7, 9, 11, 20, 44 | backbeats, Phrase Debt cadence |
| `snareLight` | 16, 18, 32, 34, 41 | ghost layer, Metrical Ghost cluster |
| `hat` | 4, 6, 10, 15, 17, 28, 33 | subdivision fill |
| `hatLight` | 21, 26, 38 | density without weight |
| `rim` | 3, 14, 37 | syncopation, off-grid accents |
| `clickChoke` | 22, 31, 36, 39, 40, 43 | Choke Syncopation, Abrasion Pocket |
| `flam` | 7, 8, 12, 19, 25, 29, 44 | pre-beat tension, transition fills |

**Open question (fork F-1):** role assignment is partly subjective. Two options —
(a) hand-curate this table once from listening, or (b) auto-classify by analyzing each
WAV (centroid → hat/snare/kick, transient sharpness → flam/choke) at build time. (a) is
faster and good enough; (b) is more honest and scales if slices change again.

---

## 4. The construct taxonomy (the actual spine)

Not all constructs are the same *kind* of thing. Sorting them is the central design
move — it determines what the composer does with each one.

**Post-§0.5 framing:** these are no longer content sources. Each takes the **groove
substrate** (the pocket for this section) as input and **deviates from it**, returning a
new lane. A construct at intensity 0 should leave the pocket nearly untouched; at
intensity 1 it overruns it. "Generate a section" = "apply this deviation to the pocket
for N bars." The pocket is always there underneath.

### Tier A — Section operators (deviate the pocket across a block of bars)

| Construct | Rule | Guardrail (its collapse condition → clamp) |
|---|---|---|
| **Metrical Ghost** | withhold a strong-beat step; cluster density around the hole | surrounding density held in a mid band; over-fill kills it. *Sub-anchored originally — now drum-only (see audit below)* |
| **Gravitational Liminality** | imply the kick pulse without sounding the kick | non-kick elements must reinforce the absent grid or it reads as nothing |
| **Subdivided Relentlessness** | jungle density at steppers repetition scale | high repetition, **low novelty** — accumulation not proliferation |
| **Structural Aliasing** | fully quantized but density > tracking resolution | grid stays exact; density pushed just past the legibility threshold |
| **Temporal Foreclosure** | establish a grid commitment, then make it impossible to honor | must set the grid clearly *first*, then violate |
| **Percussive Opacity** | transient density/saturation past parsing | keep grid present underneath the wall |
| **Monophonic Polyrhythm** | one voice (kick) spaced to imply multiple pulse-streams | accent/spacing implies cross-rhythm; one timbre only |
| **Pressure Pulse** | density where onsets blur but aggregate has direction | onset blur high, net directional drift preserved |

### Tier B — Arc operators (act *between* sections, not within one)

| Construct | Role in the arc |
|---|---|
| **Phrase Debt** | quote a recognizable phrase in section *i*, default/violate its cadence entering *i+1*. This is the connective tissue across the whole arc. |
| **Stochastic Caesura** | the drop — saturate to overload so the body reads a rest. Best as a transition into the back half. |
| **Structural Absence** | yank an established element at a boundary; the gap organizes the next section. |
| **Threat Meter** | payoff inversion — build expectation, answer with punishment instead of release. Peak-of-arc device. |
| **Reserved Incompletion** | end on a structurally-specified absence; the arc refuses to close. Natural arc terminator. |

### Tier C — Cross-cutting biases (modulate selection/timing *everywhere*)

| Construct | Effect |
|---|---|
| **Corpse Meter** | preserve the original drummer's slice **adjacency / ordering** through chops. Implemented as a Markov bias on slice selection (slice *n* prefers the slices that followed it in the source), not as a section. Collapses if order is fully randomized — so it's the anti-randomness pressure on every generator. |
| **Choke Syncopation / Abrasion Pocket** | place `clickChoke` slices on rhythmically significant positions; grid survives, content goes unresolvable. A timbral overlay any section can opt into. |

This three-tier split is what makes the composer tractable: **Tier A fills sections,
Tier B joins them, Tier C colors all of them.**

**Sub-removal audit (per F-5).** No construct is *purely* sub-driven, so none are cut.
But two lean on the sub for their anchor and get re-expressed drum-only:

- **Metrical Ghost** — the doc anchors the withheld beat's implied position partly on the
  sub grid. Drum-only, the anchor comes from the symmetry/spacing of the surrounding
  drum cluster alone; your Ableton bass restores the rest. Slightly weaker in preview,
  intact in context.
- **Gravitational Liminality** — "kick present-as-force, absent-as-event" reads cleaner
  with a sub implying the missing kick. Drum-only, the implied pulse is carried by
  reinforcing off-beats and ghosted hats. Still lands; relies more on the listener.

Everything else (Subdivided Relentlessness, Structural Aliasing, Temporal Foreclosure,
Percussive Opacity, Monophonic Polyrhythm, Pressure Pulse, all Tier B/C) was already
drum-mechanical and is unaffected.

---

## 5. The generator interface

```ts
interface GenContext {
  rng: Rng;              // seeded — same seed ⇒ same output
  roles: RoleMap;
  bpm: number;           // 170
  bars: number;          // how long this section runs
  intensity: number;     // 0..1 — the arc's tension; 0 ⇒ leave the pocket ~clean
  pocket: SliceLane;     // the groove substrate for this section (§0.5) — the INPUT
  groove: GrooveTemplate;// swing/accent pocket, so deviations stay in the feel
  corpse?: MarkovBias;   // Tier-C ordering pressure (optional)
}

interface Generator {
  id: string;
  tier: "A";
  style: string;                 // for the L/A/G badge + grouping
  naturalBars: [min, max];       // its comfortable length range
  tensionRange: [min, max];      // where on the arc curve it belongs
  /** deviate the pocket and return the new lane — NOT generate from scratch (§0.5). */
  generate(ctx: GenContext): SliceLane[];   // slice lanes only — no sub (F-5)
}
```

The construct's **edge** maps directly to clamped parameter ranges inside `generate`.
Metrical Ghost's "collapses when density too high/low" becomes
`density = clamp(lerp(0.35, 0.7, intensity), 0.35, 0.7)` — the randomness lives
*inside* the band the doc certified as the zone where it lands.

---

## 6. The arc composer (`composer.ts`)

An arc is a **groove substrate with a tension curve of deviations over it**:

0. **Lay the pocket (§0.5).** Build the groove substrate for the whole arc first —
   canonical Amen backbone + swing/accent template + a Variant-Economy bar-to-bar
   evolution. This is the default state; if every construct did nothing, the arc would
   still groove.
1. Pick a curve archetype (seeded): e.g. `pocket-build-peak-drop-refuse`,
   `front-loaded`, `two-rises`, `pocket-with-stabs`. **The curve must visit its floor** —
   sections at low tension play the pocket nearly clean; that's the groove the chaos
   contrasts against. A curve with no troughs is the frantic bug.
2. Walk the curve. At each position, read the local tension; at the **floor** keep the
   pocket (optionally Variant Economy / Phrase Gravity only); above it, pick a Tier-A
   **deviation** whose `tensionRange` contains the tension (weighted by palette toggles)
   and apply it to that section's pocket at that intensity.
3. Assign that section a length from the operator's `naturalBars`, jittered — variable
   section lengths, per your ask.
4. At each boundary, maybe insert a Tier-B operator (Stochastic Caesura on a big drop,
   Structural Absence on a re-entry, Phrase Debt threading a quoted snare across).
5. Apply Tier-C biases globally (Corpse Meter ordering, optional choke overlay).
6. Concatenate all sections' lanes into one `Pattern`, `loop:false`. Done — playable
   and exportable immediately.

**Why this gives "an arc without a full track":** no fixed 8/16/32-bar grid, no song
form, no intro/breakdown/drop labels — just a tension shape filled with rule-instances
of organic lengths. Typical total: 12–32 bars.

### Solving "lots of possibilities without overwhelming"

The arc is fully determined by `(seed, palette, curve-bias, locks)`. Rather than a wall
of simultaneous cards, possibilities are managed **in time** (see §8 — the lineage rail)
and by **directed search** (lock the sections you like, re-roll only the rest, mutate a
keeper by seed perturbation). One arc in focus; a curated history behind it; a small set
of forward moves. The firehose is replaced by a steering wheel.

---

## 7. MIDI export (`smf.ts` / `export.ts`)

Target: **Sliced Simpler, chromatic from C1** (your answer). Mapping:

```
note   = root + (slice - 1)          // root = 36 (C1); slice 1 → C1, slice 44 → G4
onset  = stepIndex * stepDur         // stepDur = 60 / bpm / (stepsPerBar/4)
length = gate ?? stepDur
vel    = round((gain ?? 1) * 127)
ratchet R ⇒ R notes subdividing the step
```

- **Format 1 SMF**, tempo meta = 170 BPM, PPQ 480. **Single track = drums** (the slice
  lane). No sub track (F-5) — you add bass in Ableton.
- **What survives:** onset, slice selection, velocity, note length/gate, ratchets, prob
  (baked at export).
- **What doesn't, and why it's fine:** `rate`, `reverse`, `offset`, `pan`, `sat` are
  audio-domain. Simpler in *slice mode* selects the slice by note and ignores incoming
  pitch, so `rate` pitch-tricks can't ride the MIDI anyway. The MIDI is a **trigger
  map**; the timbral mangling stays a web-app preview thing. Worth stating up front so
  the Ableton import isn't surprising.
- **Micro-timing (F-6): preserve offsets.** Onsets are *not* grid-quantized — each note
  carries the small timing offset that Corpse Meter's hand-tagged successor chain (F-4)
  implies, so the corpse survives into the MIDI. Import un-warped / quantize-off in Live;
  re-quantize there if you ever want it clean.

---

## 8. Interface — an idea generator, not a DAW

We ditch the card grid. A catalog of finished things pushes the wrong mental model
("browse N outputs"); we want a workbench for driving **one arc** into being and
steering toward the break you're hearing in your head, then **downloading the MIDI**. The
design centers the arc, makes its construct-logic visible, and turns "lots of
possibilities" into a directed search rather than a wall.

**Scope line: this is not an editor.** Fine-grained editing — moving individual hits,
tweaking velocities, comping — happens in Ableton. The interface's job ends at the MIDI
download. So there's **no cell grid and no hand-editing**. Steering is **coarse and
construct-level only**: roll, lock, swap a section, mutate, export. Anything finer is the
DAW's job. This keeps the surface small and the tool honest about what it's for.

### Principle: A/B/C slots, one focused; possibilities live in time, not space

Three arc slots — **A / B / C** — for direct comparison (F-10). One is **focused** (full
timeline + inspector + transport drive it); the other two sit as compact comparison
strips you can solo or promote to focus. You roll into a slot, A/B/C them by ear, keep
the winner, export it. Three is the ceiling: enough to contrast a vibe, not a wall.

```
┌───────────────────────────────────────────────────────────────────┐
│ TRANSPORT  ▶ ■  ◷0:00/0:07  170 BPM  ⟲loop-section  [A]B C  ⤓ MIDI │
├───────────────────────────────────────────────────────────────────┤
│ TENSION  ╭──╮         ╭───────╮                                     │  ← curve drawn
│         ╱    ╲___╱╲__╱         ╲___                                 │   through slot A
│ ┌─────┬───────┬──◇──┬──────────┬────────┬─────┐                     │
│ │Grav │Subdiv │Meta │ Temporal │ Threat │Resv │   ← section blocks  │
│ │Limin│Relent │Ghost│ Foreclos │ Meter  │Incmp│     (style-colored) │
│ │ 3🔒 │  4    │  2  │    5     │   3 ◇  │  2  │     bars + lock     │
│ └─────┴───────┴──┬──┴──────────┴────────┴─────┘                     │
│  corpse-meter ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰  choke ▱▱▱▱   ← Tier-C underlay    │
│ ─ B ▕▂▃▅▇▅▃▂▁▂▃─ solo  ·  C ▕▁▂▃▂▅▇▇▅▃─ solo   ← compare strips     │
├───────────────────────────────────────────────────────────────────┤
│ [waveform of focused arc / selected section]                       │
├───────────────────────────────────────────────────────────────────┤
│ INSPECTOR (Meta Ghost selected):  swap▾  density●──── len 2  🔒    │
├───────────────────────────────────────────────────────────────────┤
│ ⚄ ROLL→A   seed 48213   palette: Brk Ftw Gbr Stp PwN   len● int●  │
│ LINEAGE  ★48213 ·∿·  12990 ·∿·  ★90733 ·∿·   (re-roll unlocked)    │
└───────────────────────────────────────────────────────────────────┘
```

**Zones:**

1. **Transport** — play/stop, scrub, position, fixed 170 BPM, **loop-section** (audition
   one block on repeat), **A/B/C focus switch**, and MIDI export of the focused slot. The
   seed is the shareable artifact.
2. **Arc timeline (the hero — the focused slot)** — sections as blocks left→right, width ∝ bars,
   style-colored, labeled with construct + bar count. The **tension curve** is drawn
   through them so the arc's logic is legible at a glance. **Tier-B operators render as
   boundary markers** (◇) between blocks; click one to see what it's doing (a Caesura, a
   Phrase-Debt thread). **Tier-C biases are an underlay strip** spanning the arc (corpse
   on/off, choke density). Playhead sweeps across.
3. **Per-section controls on the block:** a **lock** (🔒 pins it through re-rolls — this
   is the steering primitive) and click-to-select.
4. **Waveform** — the existing `waveform.ts`, now under the timeline; follows the whole
   arc or the selected/soloed section.
5. **Inspector** — for the selected section: **swap construct** (dropdown filtered to
   generators valid at this tension position — this is where the old construct browser
   gets repurposed as a *functional picker*), the guardrail-bounded knobs (density etc.,
   clamped to the certified band so you can't push it into collapse), and length.
6. **Compare strips (B/C)** — the two unfocused slots as one-line waveform/curve sparks
   with **solo** and **promote-to-focus**. This is the A/B/C surface.
7. **Generation bar** — **Roll → focused slot**, editable seed, the five palette toggles,
   length + intensity bias sliders, **re-roll unlocked only**, **mutate** (perturb current
   seed). A roll fills the focused slot; the previous occupant drops to the lineage rail.
8. **Lineage rail** — every roll as a compact thumbnail (tension-curve sparkline + seed);
   ★ to keep, click to recall into a slot. Curated history replaces the card wall.

### The workflow this affords

`roll into A/B/C → solo to compare → focus the winner → lock keepers → re-roll the rest →
swap a section that isn't working → mutate for variants → export MIDI → finish in Ableton`.
A purposeful loop — directed search ending in a download — not a slot machine, not a DAW.

---

## 9. Decisions (locked)

- **F-1 Roles → hand-curated.** Build the slice→role table by ear, once, from the WAVs.
  No build-time auto-classification.
- **F-2 SMF → hand-rolled.** Zero-dep format-1 encoder in `smf.ts`. Keeps the CF deploy
  lean.
- **F-3 Determinism → seeded + mutate.** Pure `(seed)→arc` reproducibility, plus a
  **mutate** button that perturbs the current seed for variations-on-a-theme. No live
  evolve-while-playing mode.
- **F-4 Corpse Meter → hand-tagged successors.** A hand-authored "natural successors"
  table per slice drives the adjacency bias, not the raw 1→44 order.
- **F-5 Export → drums only, no sub.** Single MIDI track. **Generators emit no sub lane.**
  Ripples (handled in §2/§4/§6/§7): the SubLane/SubVoice engine code stays (harmless, still
  plays the reference JSONs) but nothing generates into it; and sub-anchored construct
  mechanisms get re-expressed drum-only — your Ableton bass supplies the anchor. No
  construct is *purely* sub, so none are cut wholesale; see the §4 audit note.
- **F-6 Micro-timing → groove template + small jitter.** Onsets are non-quantized, but
  the dominant offset is the **consistent groove pocket** (§0.5), not corpse-jitter;
  Corpse Meter adds a small amount on top. Consistent displacement = feel; pure random =
  the frantic bug.
- **F-7 Spec debt → fix.** Write `docs/sequencer-spec.md` documenting the existing engine
  so the `§` citations resolve. Low priority, but it's worth having.
- **F-8 Interface → arc/timeline.** Sections in time, tension curve drawn through. The
  rack metaphor is dropped.
- **F-10 Compare → A/B/C.** Up to three arc slots compared side by side (see §8), fed by
  the lineage rail. Not strict single-focus, not a wall.

---

## 10. Suggested build phases

1. **Foundation:** `rng.ts`, hand-curated `roles.ts`, hand-rolled `smf.ts` + `export.ts`
   (single drum track, timing offsets), and a trivial one-bar export → prove the pipe
   end-to-end (play → export → Ableton).
2. **Groove substrate (§0.5) — do this before any construct.** `groove.ts`: canonical
   Amen backbone + swing/accent template + Variant Economy + Phrase Gravity. Ship an arc
   that is *pocket only* and verify it grooves at 170 with zero constructs. This is the
   anti-frantic gate — if the bare pocket doesn't nod, nothing downstream will.
3. **Tier A deviations:** the 8 operators, each transforming the pocket (not generating
   from scratch); re-express Metrical Ghost + Gravitational Liminality without sub.
4. **Composer:** tension curves *that visit the floor* + sequencing + variable lengths.
5. **Tier B + C:** arc operators, Corpse Meter (hand-tagged successors) + choke biases.
6. **UI:** transport + arc timeline + tension curve + A/B/C slots + lineage rail +
   roll/lock/mutate + inspector swap + MIDI export. The whole instrument.
7. **Polish:** L/A/G honesty per generator, `docs/sequencer-spec.md` (F-7), tidy the
   stale "16" comments.
```

