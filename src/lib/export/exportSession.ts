import type { PracticeSession } from "@/lib/types";

type SessionMetadata = Omit<PracticeSession, "audioBlob">;

function stripAudio(session: PracticeSession): SessionMetadata {
  const rest: SessionMetadata & { audioBlob?: Blob | null } = { ...session };
  delete rest.audioBlob;
  return rest;
}

/** JSON-serialisable view of a session, omitting the raw audio Blob. */
export function sessionToMetadataJson(session: PracticeSession): string {
  return JSON.stringify(stripAudio(session), null, 2);
}

export function allSessionsToMetadataJson(sessions: PracticeSession[]): string {
  return JSON.stringify(sessions.map(stripAudio), null, 2);
}

export function downloadTextFile(filename: string, contents: string, mimeType = "application/json") {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
