import { describe, expect, it } from "vitest";
import { SpotifyEmbedReferenceProvider } from "@/lib/providers/spotifyEmbedReferenceProvider";

const VALID_ID = "4uLU6hMCjMI75M1A2tKUQC"; // 22 chars, well-formed shape (not a real lookup)

describe("SpotifyEmbedReferenceProvider", () => {
  const provider = new SpotifyEmbedReferenceProvider();

  it("parses a track URL", () => {
    const ref = provider.parseUrl(`https://open.spotify.com/track/${VALID_ID}`);
    expect(ref).toEqual({ url: `https://open.spotify.com/track/${VALID_ID}`, kind: "track", id: VALID_ID });
  });

  it("parses an album URL", () => {
    const ref = provider.parseUrl(`https://open.spotify.com/album/${VALID_ID}`);
    expect(ref?.kind).toBe("album");
  });

  it("parses a playlist URL", () => {
    const ref = provider.parseUrl(`https://open.spotify.com/playlist/${VALID_ID}`);
    expect(ref?.kind).toBe("playlist");
  });

  it("tolerates query parameters (e.g. si= share tracking)", () => {
    const ref = provider.parseUrl(`https://open.spotify.com/track/${VALID_ID}?si=abcd1234`);
    expect(ref?.id).toBe(VALID_ID);
  });

  it("tolerates a locale-prefixed path", () => {
    const ref = provider.parseUrl(`https://open.spotify.com/intl-en/track/${VALID_ID}`);
    expect(ref?.id).toBe(VALID_ID);
  });

  it("parses a spotify: URI", () => {
    const ref = provider.parseUrl(`spotify:track:${VALID_ID}`);
    expect(ref?.kind).toBe("track");
  });

  it("rejects a non-Spotify host", () => {
    expect(provider.parseUrl(`https://evil.example.com/track/${VALID_ID}`)).toBeNull();
  });

  it("rejects a javascript: URI", () => {
    expect(provider.parseUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects a malformed id", () => {
    expect(provider.parseUrl("https://open.spotify.com/track/short")).toBeNull();
  });

  it("rejects an unsupported resource type", () => {
    expect(provider.parseUrl(`https://open.spotify.com/artist/${VALID_ID}`)).toBeNull();
  });

  it("rejects plain text", () => {
    expect(provider.parseUrl("not a url at all")).toBeNull();
  });

  it("builds an official embed URL", () => {
    const ref = provider.parseUrl(`https://open.spotify.com/track/${VALID_ID}`)!;
    expect(provider.getEmbedUrl(ref)).toBe(`https://open.spotify.com/embed/track/${VALID_ID}`);
  });

  it("builds an external open-in-Spotify URL", () => {
    const ref = provider.parseUrl(`https://open.spotify.com/track/${VALID_ID}`)!;
    expect(provider.getExternalUrl(ref)).toBe(`https://open.spotify.com/track/${VALID_ID}`);
  });
});
