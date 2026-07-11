"use client";

import { useEffect, useState } from "react";

interface PlaybackPlayerProps {
  blob: Blob | null;
}

/** Owns the object URL lifecycle for a recorded Blob: creates it on mount/blob
 * change and revokes it on cleanup so we never leak memory across sessions. */
export function PlaybackPlayer({ blob }: PlaybackPlayerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState(false);

  // Reset the playback error whenever we're handed a different recording.
  // Doing this during render (rather than in the effect below) keeps the
  // reset in sync with the very first paint of the new blob.
  const [trackedBlob, setTrackedBlob] = useState(blob);
  if (blob !== trackedBlob) {
    setTrackedBlob(blob);
    setPlaybackError(false);
  }

  useEffect(() => {
    // This effect exists specifically to synchronize with an external
    // resource (a browser object URL) that needs matching create/revoke
    // calls — exactly the case effects are for, so the setState calls
    // here are the correct half of that synchronization, not incidental.
    if (!blob) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!blob || !url) {
    return (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-foreground-muted">
        No audio was kept for this session.
      </p>
    );
  }

  if (playbackError) {
    return (
      <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger">
        This recording couldn&apos;t be played back — the saved audio may be corrupt. Your session notes and analysis
        are still intact.
      </p>
    );
  }

  return (
    <audio
      controls
      src={url}
      preload="metadata"
      className="w-full"
      aria-label="Play back this practice recording"
      onError={() => setPlaybackError(true)}
    >
      Your browser does not support audio playback.
    </audio>
  );
}
