export function formatSegmentLabel(startSeconds: number, endSeconds: number): string {
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };
  return `${fmt(startSeconds)}-${fmt(endSeconds)}`;
}

export function timingLabel(score: number | null): string {
  if (score === null) return "not measured";
  if (score >= 85) return "highly consistent";
  if (score >= 65) return "consistent";
  if (score >= 40) return "steady";
  return "developing";
}

export function dynamicsLabel(score: number): string {
  if (score >= 85) return "highly consistent";
  if (score >= 65) return "consistent";
  if (score >= 40) return "steady";
  return "developing";
}
