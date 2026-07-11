/**
 * Downsamples a decoded AudioBuffer into a fixed number of peak-amplitude
 * buckets for a lightweight timeline waveform. This is a simple amplitude
 * envelope for visual orientation — not the same frame grid the analysis
 * engine uses internally, and not intended for any measurement purpose.
 */
export function computeWaveformEnvelope(buffer: AudioBuffer, bucketCount = 300): Float32Array {
  const channelCount = buffer.numberOfChannels;
  const length = buffer.length;
  const envelope = new Float32Array(bucketCount);
  if (length === 0 || bucketCount === 0) return envelope;

  const samplesPerBucket = Math.max(1, Math.floor(length / bucketCount));
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) channelData.push(buffer.getChannelData(c));

  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const start = bucket * samplesPerBucket;
    const end = Math.min(length, start + samplesPerBucket);
    let peak = 0;
    for (let i = start; i < end; i++) {
      for (let c = 0; c < channelCount; c++) {
        const abs = Math.abs(channelData[c][i]);
        if (abs > peak) peak = abs;
      }
    }
    envelope[bucket] = peak;
  }

  return envelope;
}
