"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { SessionResultView } from "@/components/result/SessionResultView";
import { getSessionRepository } from "@/lib/storage/sessionRepository";
import { useProfile } from "@/lib/state/ProfileProvider";
import type { PracticeSession } from "@/lib/types";

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile } = useProfile();
  const [session, setSession] = useState<PracticeSession | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getSessionRepository()
      .getById(id)
      .then((result) => {
        if (!cancelled) setSession(result);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleChange = async (patch: Partial<PracticeSession>) => {
    if (!session) return;
    const updated = { ...session, ...patch, updatedAt: Date.now() };
    setSession(updated);
    await getSessionRepository().update(updated);
  };

  const handleDelete = async () => {
    await getSessionRepository().delete(id);
    router.replace("/history");
  };

  if (session === undefined) {
    return (
      <PageContainer>
        <p className="text-sm text-foreground-muted">Loading session…</p>
      </PageContainer>
    );
  }

  if (session === null) {
    return (
      <PageContainer>
        <EmptyState
          icon="🔍"
          title="Session not found"
          description="This session may have been deleted, or the link is no longer valid."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SessionResultView
        session={session}
        mode="saved"
        developerMode={profile.developerMode}
        onChange={handleChange}
        onDelete={handleDelete}
      />
    </PageContainer>
  );
}
