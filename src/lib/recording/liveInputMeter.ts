import { getAudioContextConstructor } from "@/lib/capability/browserCapabilities";

export interface LiveMeterReading {
  /** 0-1 RMS level of the current buffer. */
  rms: number;
  /** 0-1 peak level of the current buffer. */
  peak: number;
  /** True when the signal is at or very near full scale. */
  clipping: boolean;
  /** Time-domain samples for waveform drawing, range -1..1. */
  waveform: Float32Array;
}

/**
 * Wraps an AnalyserNode over a live MediaStream to provide level metering
 * and waveform data for the recording screen. Kept separate from
 * MediaRecorder so metering keeps working independent of recorder state.
 */
export class LiveInputMeter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private buffer: Float32Array<ArrayBuffer> = new Float32Array(0);

  attach(stream: MediaStream): void {
    const Ctor = getAudioContextConstructor();
    if (!Ctor) throw new Error("Web Audio API is not supported in this browser.");
    this.audioContext = new Ctor();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.3;
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    this.buffer = new Float32Array(this.analyser.fftSize);
  }

  /** iOS Safari suspends AudioContext until a user gesture; call this from a click handler. */
  async ensureResumed(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  read(): LiveMeterReading | null {
    if (!this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this.buffer);

    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const value = this.buffer[i];
      sumSquares += value * value;
      const abs = Math.abs(value);
      if (abs > peak) peak = abs;
    }
    const rms = Math.sqrt(sumSquares / this.buffer.length);

    return {
      rms,
      peak,
      clipping: peak >= 0.98,
      waveform: this.buffer.slice(),
    };
  }

  detach(): void {
    this.source?.disconnect();
    this.analyser?.disconnect();
    if (this.audioContext && this.audioContext.state !== "closed") {
      void this.audioContext.close();
    }
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
  }
}
