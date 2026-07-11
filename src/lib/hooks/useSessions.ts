"use client";

import { useCallback, useEffect, useState } from "react";
import type { PracticeSession } from "@/lib/types";
import { getSessionRepository } from "@/lib/storage/sessionRepository";

export function useSessions() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getSessionRepository().list();
      setSessions(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load practice sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // IndexedDB reads are inherently asynchronous, so there is no
    // synchronous alternative to loading the session list on mount —
    // this is the standard "fetch in an effect" case the lint heuristic
    // doesn't distinguish from avoidable synchronous setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { sessions, loading, error, refresh };
}
