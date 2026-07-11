"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SpotifyEmbedReferenceProvider } from "@/lib/providers/spotifyEmbedReferenceProvider";
import type { SpotifyReference } from "@/lib/types";

interface SpotifyReferencePanelProps {
  reference: SpotifyReference | null;
  onChange: (reference: SpotifyReference | null) => void;
}

const provider = new SpotifyEmbedReferenceProvider();

/**
 * A song can optionally be linked as a separate Spotify listening
 * reference — never as an audio source for analysis. See FEATURE 13: no
 * Spotify audio is ever fetched, streamed into Web Audio, recorded, or
 * mixed with the user's own recording. This panel only ever renders
 * Spotify's own official embed player and a link back to Spotify.
 */
export function SpotifyReferencePanel({ reference, onChange }: SpotifyReferencePanelProps) {
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!!reference);

  const handleAdd = () => {
    const parsed = provider.parseUrl(urlInput);
    if (!parsed) {
      setError("This doesn't look like a Spotify track, album, or playlist link.");
      return;
    }
    setError(null);
    setUrlInput("");
    onChange(parsed);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="min-h-[44px] w-full rounded-2xl border border-dashed border-border text-sm font-medium text-foreground-muted"
      >
        + Add a Spotify reference link
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Spotify reference</h3>
      <p className="text-xs text-foreground-muted">
        Spotify is provided as a separate listening reference. FretCoach does not analyse or copy Spotify audio.
      </p>

      {!reference && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
            Paste Spotify song link
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://open.spotify.com/track/…"
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
          <Button size="md" variant="secondary" onClick={handleAdd} disabled={!urlInput.trim()}>
            Add reference
          </Button>
        </div>
      )}

      {reference && (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-2xl">
            <iframe
              title="Spotify player"
              src={provider.getEmbedUrl(reference)}
              width="100%"
              height="152"
              style={{ border: 0 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={provider.getExternalUrl(reference)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface-muted px-4 text-sm font-medium"
            >
              Open in Spotify
            </a>
            <Button
              size="md"
              variant="ghost"
              onClick={() => {
                onChange(null);
                setExpanded(false);
              }}
            >
              Remove reference
            </Button>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
            Notes (e.g. section timestamps, chord progression)
            <textarea
              value={reference.sectionNotes ?? ""}
              onChange={(e) => onChange({ ...reference, sectionNotes: e.target.value })}
              placeholder="e.g. Intro begins around 0:18; verse uses G, D, Em, C"
              rows={2}
              className="w-full rounded-xl border border-border bg-surface p-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
            />
          </label>
        </div>
      )}
    </Card>
  );
}
