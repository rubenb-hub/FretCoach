import { getAudioContextConstructor } from "@/lib/capability/browserCapabilities";

export class AudioDecodeError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AudioDecodeError";
  }
}

/** Decodes a recorded Blob into an AudioBuffer, surfacing a friendly error on failure. */
export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const Ctor = getAudioContextConstructor();
  if (!Ctor) {
    throw new AudioDecodeError("This browser does not support Web Audio decoding.");
  }
  const arrayBuffer = await blob.arrayBuffer();
  const context = new Ctor();
  try {
    // Safari requires the callback-style overload in some versions; the
    // promise-style call falls back gracefully where supported.
    const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
    return audioBuffer;
  } catch (error) {
    throw new AudioDecodeError(
      "The recording could not be decoded. It may be corrupt or in an unsupported format.",
      error
    );
  } finally {
    void context.close();
  }
}

/** Combines all channels of an AudioBuffer into a single mono Float32Array. */
export function toMonoSamples(buffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length } = buffer;
  if (numberOfChannels === 1) {
    return buffer.getChannelData(0).slice();
  }
  const mono = new Float32Array(length);
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / numberOfChannels;
    }
  }
  return mono;
}
