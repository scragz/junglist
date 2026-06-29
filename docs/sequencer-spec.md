# Sequencer Spec

This document records the engine contract used by both hand-authored patterns and generated arcs.

## 0.1 Shared Audio Context

The app owns one `AudioEngine`, one `AudioContext`, one `BufferPool`, and one analyser. Players are disposable schedulers over shared buffers and a shared master chain.

## 1 Audio Assets

Amen slices are loaded from `audio/amen-01.wav` through `audio/amen-44.wav`. Slice numbers in pattern cells are 1-indexed and clamped to the loaded buffer range at playback.

## 2 Master Chain

Slice and sub voices feed a player bus, then the shared master gain. Saturation sends feed the limiter alongside dry audio. The analyser sits after the limiter so the waveform represents audible output.

## 3 Pattern Format

A `Pattern` is the only playback unit. A generated arc is also a `Pattern`: its `bars` are the sum of section lengths and `loop` is `false`.

### 3.1 Timing

`stepDur = 60 / bpm / (stepsPerBar / 4)`. A 16-step bar is sixteenth notes; a 24-step bar is sixteenth-note triplets.

### 3.2 Lanes

Every lane has `bars * stepsPerBar` cells. Short imported lanes are padded with trailing rests. Longer lanes are rejected.

### 3.3 Slice Cells

A slice cell may be a number, or an object with `slice`, `gain`, `rate`, `reverse`, `offset`, `timing`, `gate`, `pan`, `sat`, `ratchet`, and `prob`.

`offset` is audio-buffer start offset. `timing` is onset nudge in seconds relative to the grid and is preserved by generated MIDI export.

## 4 Playback

### 4.1 Scheduler

`PatternPlayer` uses a Web Audio clock lookahead scheduler. Non-looping patterns schedule to completion, allow a short tail, then call `onEnded`.

### 4.2 Slice Voices

Each slice voice uses a buffer source, gain envelope, optional pan, and optional saturation send. Rate changes pitch and duration together. Reversed playback reads from precomputed reversed buffers.

### 4.3 Sub Voices

Sub lanes remain supported for legacy reference JSONs. Generated arcs are drums-only and do not emit sub lanes.

### 4.4 Saturation Send

Per-cell `sat` values route a copy into the shared saturation bus. This is preview-only behavior and is not represented in MIDI.

## 5 Browser Constraints

### 5.1 Autoplay Unlock

The audio context resumes and buffers decode inside a user gesture before playback.

### 5.6 Reverse Buffers

Negative playback rates are not relied on. Reversed buffers are precomputed after decoding.

### 5.7 Bundled URLs

Vite resolves audio URLs at build time through `import.meta.glob`.

### 5.9 Waveform

The waveform reads the shared analyser, so it follows whichever pattern or arc is currently audible.

## 6 Lands Badge

`L`, `A`, and `G` describe how convincingly a construct lands in this medium: lands, approximate, or gesture.

## 7 Mutual Exclusion

The engine defaults to one active player. Starting a new pattern stops the previous player.

## 8 Master Safety

The compressor acts as a soft limiter for dense ratchets, saturation, and overlapping voices.

## 9.6 Validation

`validatePattern` checks required fields, lane types, and lane lengths. It does not cap slice numbers to an old 16-slice range.
