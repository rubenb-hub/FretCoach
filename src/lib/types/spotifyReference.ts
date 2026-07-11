/**
 * A user-attached Spotify reference: strictly a "listen to this separately"
 * pointer. FretCoach never fetches, analyses, or transforms Spotify audio —
 * see lib/providers/spotifyEmbedReferenceProvider.ts for the URL
 * validation/embed logic and docs/audio-analysis-architecture.md for the
 * technical/legal separation rationale.
 */
export type SpotifyReferenceKind = "track" | "album" | "playlist";

export interface SpotifyReference {
  /** The original URL exactly as pasted by the user. */
  url: string;
  kind: SpotifyReferenceKind;
  /** The Spotify resource ID parsed out of the URL. */
  id: string;
  /** User-entered notes, e.g. "intro begins around 0:18" or a chord progression. */
  sectionNotes?: string;
}
