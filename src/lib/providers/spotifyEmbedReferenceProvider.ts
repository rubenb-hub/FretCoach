import type { SpotifyReference, SpotifyReferenceKind } from "@/lib/types";

/**
 * Spotify is a separate listening reference only — FretCoach never
 * fetches, streams, records, analyses, or transforms Spotify audio. This
 * module only ever produces (a) a validated link to Spotify's own
 * official embed player and (b) a link back to open the track/album/
 * playlist in Spotify itself. See docs/audio-analysis-architecture.md
 * for the full list of things this deliberately does not do.
 *
 * Kept behind the `ReferenceMediaProvider` interface so this integration
 * can be swapped or removed entirely if Spotify's platform terms change,
 * without touching any audio-analysis code (which never references this
 * module at all).
 */
export interface ReferenceMediaProvider {
  parseUrl(url: string): SpotifyReference | null;
  getEmbedUrl(reference: SpotifyReference): string;
  getExternalUrl(reference: SpotifyReference): string;
}

const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

/** Matches open.spotify.com URLs, tolerating an optional locale segment
 * Spotify sometimes prefixes (e.g. /intl-en/track/...). */
const HTTPS_PATTERN = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]{22})(?:[/?].*)?$/;
const URI_PATTERN = /^spotify:(track|album|playlist):([A-Za-z0-9]{22})$/;

export class SpotifyEmbedReferenceProvider implements ReferenceMediaProvider {
  /** Returns null for anything that isn't a well-formed Spotify track/album/
   * playlist link — including non-Spotify hosts, malformed IDs, and any
   * scheme other than https:// or the spotify: URI form. */
  parseUrl(url: string): SpotifyReference | null {
    const trimmed = url.trim();

    const httpsMatch = HTTPS_PATTERN.exec(trimmed);
    if (httpsMatch) {
      const [, kind, id] = httpsMatch;
      if (!SPOTIFY_ID_PATTERN.test(id)) return null;
      return { url: trimmed, kind: kind as SpotifyReferenceKind, id };
    }

    const uriMatch = URI_PATTERN.exec(trimmed);
    if (uriMatch) {
      const [, kind, id] = uriMatch;
      if (!SPOTIFY_ID_PATTERN.test(id)) return null;
      return { url: trimmed, kind: kind as SpotifyReferenceKind, id };
    }

    return null;
  }

  getEmbedUrl(reference: SpotifyReference): string {
    return `https://open.spotify.com/embed/${reference.kind}/${reference.id}`;
  }

  getExternalUrl(reference: SpotifyReference): string {
    return `https://open.spotify.com/${reference.kind}/${reference.id}`;
  }
}
