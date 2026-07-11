/**
 * Returns the original buffer unchanged if it's already within
 * `maxDurationSeconds`, otherwise returns a duration-limited view over
 * only the leading `maxDurationSeconds` of channel data. Used to bound
 * the cost of the (comparatively expensive) note/chord/technique analysis
 * pass on very long recordings — see FEATURE 17's "reasonable
 * analysis-duration limit" requirement.
 *
 * This builds a plain object satisfying the small slice of the
 * AudioBuffer interface the analysis pipeline actually reads
 * (numberOfChannels/length/sampleRate/duration/getChannelData) rather
 * than going through `AudioContext.createBuffer`, since nothing here
 * needs real audio-graph playback — only decoded sample access.
 */
export function truncateAudioBuffer(
  buffer: AudioBuffer,
  maxDurationSeconds: number
): { buffer: AudioBuffer; truncated: boolean } {
  if (buffer.duration <= maxDurationSeconds) return { buffer, truncated: false };

  const frameCount = Math.floor(maxDurationSeconds * buffer.sampleRate);
  const channels: Float32Array[] = [];
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    channels.push(buffer.getChannelData(channel).slice(0, frameCount));
  }

  const truncated: AudioBuffer = {
    numberOfChannels: buffer.numberOfChannels,
    length: frameCount,
    sampleRate: buffer.sampleRate,
    duration: frameCount / buffer.sampleRate,
    getChannelData: (channel: number) => channels[channel],
  } as unknown as AudioBuffer;

  return { buffer: truncated, truncated: true };
}
