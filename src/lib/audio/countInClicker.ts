import { getAudioContextConstructor } from "@/lib/capability/browserCapabilities";

/**
 * Plays a short metronome-style count-in (a handful of clicks) using Web
 * Audio, resolving once the count-in finishes so a caller can start
 * playback or recording immediately after. This is the one place the
 * segment-playback / retry flow uses the Web Audio API directly rather
 * than a plain <audio> element, since it just needs a few synthesized
 * clicks rather than decoding/scrubbing a file.
 *
 * Must be invoked from a user-gesture handler (e.g. a button's onClick)
 * so the AudioContext can start on iOS Safari.
 */
export async function playCountIn(beats = 4, bpm = 80): Promise<void> {
  const Ctor = getAudioContextConstructor();
  if (!Ctor) return;
  const context = new Ctor();
  if (context.state === "suspended") {
    await context.resume();
  }

  const interval = 60 / bpm;
  const startTime = context.currentTime + 0.05;

  for (let i = 0; i < beats; i++) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = i === 0 ? 1400 : 900; // accent the first beat
    oscillator.type = "square";
    const clickTime = startTime + i * interval;
    gain.gain.setValueAtTime(0.0001, clickTime);
    gain.gain.exponentialRampToValueAtTime(0.4, clickTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.06);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(clickTime);
    oscillator.stop(clickTime + 0.07);
  }

  const totalMs = (beats * interval + 0.15) * 1000;
  await new Promise((resolve) => setTimeout(resolve, totalMs));
  await context.close();
}
