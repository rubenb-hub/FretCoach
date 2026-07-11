/**
 * Minimal iterative radix-2 Cooley-Tukey FFT operating in place on
 * separate real/imaginary Float32Arrays. `size` must be a power of two.
 *
 * We implement this locally rather than pulling in a dependency: the
 * analysis engine only ever needs a fixed-size real-input magnitude
 * spectrum, so a small self-contained implementation keeps the bundle
 * light and avoids a moving dependency for a core algorithm.
 */
export function fftInPlace(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error("FFT size must be a power of two.");
  }

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angleStep = (-2 * Math.PI) / len;
    const wr = Math.cos(angleStep);
    const wi = Math.sin(angleStep);
    for (let i = 0; i < n; i += len) {
      let curWr = 1;
      let curWi = 0;
      for (let j = 0; j < halfLen; j++) {
        const evenIndex = i + j;
        const oddIndex = i + j + halfLen;
        const oddRealTerm = real[oddIndex] * curWr - imag[oddIndex] * curWi;
        const oddImagTerm = real[oddIndex] * curWi + imag[oddIndex] * curWr;

        real[oddIndex] = real[evenIndex] - oddRealTerm;
        imag[oddIndex] = imag[evenIndex] - oddImagTerm;
        real[evenIndex] += oddRealTerm;
        imag[evenIndex] += oddImagTerm;

        const nextWr = curWr * wr - curWi * wi;
        const nextWi = curWr * wi + curWi * wr;
        curWr = nextWr;
        curWi = nextWi;
      }
    }
  }
}

/** Precomputed Hann window for a given frame size, used to reduce spectral leakage. */
export function createHannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
}

/**
 * Computes the magnitude spectrum (first size/2 bins) of a windowed real
 * frame. Reuses caller-provided scratch buffers to avoid GC churn across
 * the thousands of frames a typical recording produces.
 */
export function magnitudeSpectrum(
  frame: Float32Array,
  window: Float32Array,
  realScratch: Float32Array,
  imagScratch: Float32Array
): Float32Array {
  const n = frame.length;
  for (let i = 0; i < n; i++) {
    realScratch[i] = frame[i] * window[i];
    imagScratch[i] = 0;
  }
  fftInPlace(realScratch, imagScratch);
  const half = n / 2;
  const magnitudes = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    magnitudes[i] = Math.hypot(realScratch[i], imagScratch[i]);
  }
  return magnitudes;
}
