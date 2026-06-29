export interface MidiNote {
  tick: number;
  duration: number;
  note: number;
  velocity: number;
  channel?: number;
}

export interface SmfOptions {
  bpm: number;
  ppq?: number;
  trackName?: string;
}

function textBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function u16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function u32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function vlq(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  for (;;) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function chunk(id: string, data: number[]): number[] {
  return [...textBytes(id), ...u32(data.length), ...data];
}

export function encodeSmf(notes: MidiNote[], options: SmfOptions): Uint8Array {
  const ppq = options.ppq ?? 480;
  const header = chunk("MThd", [...u16(1), ...u16(1), ...u16(ppq)]);
  const tempo = Math.round(60000000 / options.bpm);
  const events: { tick: number; order: number; data: number[] }[] = [
    { tick: 0, order: 0, data: [0xff, 0x51, 0x03, (tempo >>> 16) & 0xff, (tempo >>> 8) & 0xff, tempo & 0xff] },
  ];
  if (options.trackName) {
    const name = textBytes(options.trackName);
    events.push({ tick: 0, order: 1, data: [0xff, 0x03, name.length, ...name] });
  }
  for (const note of notes) {
    const channel = note.channel ?? 9;
    const noteNumber = Math.max(0, Math.min(127, Math.round(note.note)));
    const velocity = Math.max(1, Math.min(127, Math.round(note.velocity)));
    const tick = Math.max(0, Math.round(note.tick));
    const end = Math.max(tick + 1, Math.round(tick + note.duration));
    events.push({ tick, order: 2, data: [0x90 | channel, noteNumber, velocity] });
    events.push({ tick: end, order: 1, data: [0x80 | channel, noteNumber, 0] });
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const track: number[] = [];
  let lastTick = 0;
  for (const event of events) {
    track.push(...vlq(event.tick - lastTick), ...event.data);
    lastTick = event.tick;
  }
  track.push(...vlq(0), 0xff, 0x2f, 0x00);

  return new Uint8Array([...header, ...chunk("MTrk", track)]);
}
