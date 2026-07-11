"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SettingRow, Toggle } from "@/components/settings/SettingRow";
import { AudioInputTest } from "@/components/settings/AudioInputTest";
import { useProfile } from "@/lib/state/ProfileProvider";
import { useTheme } from "@/lib/state/ThemeProvider";
import { useSessions } from "@/lib/hooks/useSessions";
import { getSessionRepository } from "@/lib/storage/sessionRepository";
import { allSessionsToMetadataJson, downloadTextFile } from "@/lib/export/exportSession";
import { generateDemoSessions } from "@/lib/demo/demoSessions";

export default function SettingsPage() {
  const { profile, updateProfile } = useProfile();
  const { preference, setPreference } = useTheme();
  const { sessions, refresh } = useSessions();
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const hasDemoSessions = sessions.some((s) => s.isDemo);

  const loadDemoSessions = async () => {
    setGeneratingDemo(true);
    try {
      const demoSessions = await generateDemoSessions(profile);
      const repo = getSessionRepository();
      for (const session of demoSessions) await repo.create(session);
      await refresh();
    } finally {
      setGeneratingDemo(false);
    }
  };

  const removeDemoSessions = async () => {
    const repo = getSessionRepository();
    for (const session of sessions.filter((s) => s.isDemo)) await repo.delete(session.id);
    await refresh();
  };

  const exportAll = () => {
    downloadTextFile(`fretcoach-sessions-${Date.now()}.json`, allSessionsToMetadataJson(sessions));
  };

  const deleteAll = async () => {
    await getSessionRepository().clearAll();
    await refresh();
    setConfirmingDeleteAll(false);
  };

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Audio</h2>
        <AudioInputTest />
        <div className="mt-2 divide-y divide-border">
          <SettingRow label="Recording quality" description="Higher quality uses more storage per session.">
            <select
              value={profile.recordingQuality}
              onChange={(e) => updateProfile({ recordingQuality: e.target.value as "standard" | "high" })}
              className="h-10 rounded-xl border border-border bg-surface px-2 text-sm"
            >
              <option value="standard">Standard</option>
              <option value="high">High</option>
            </select>
          </SettingRow>
          <SettingRow label="Analysis sensitivity" description="How readily quiet playing counts as active.">
            <select
              value={profile.analysisSensitivity}
              onChange={(e) => updateProfile({ analysisSensitivity: e.target.value as "low" | "standard" | "high" })}
              className="h-10 rounded-xl border border-border bg-surface px-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="standard">Standard</option>
              <option value="high">High</option>
            </select>
          </SettingRow>
          <SettingRow label="Long pause threshold" description="Stops longer than this count as a long pause.">
            <select
              value={profile.longPauseThresholdSeconds}
              onChange={(e) => updateProfile({ longPauseThresholdSeconds: Number(e.target.value) })}
              className="h-10 rounded-xl border border-border bg-surface px-2 text-sm"
            >
              {[2, 3, 4, 5, 8].map((s) => (
                <option key={s} value={s}>
                  {s} seconds
                </option>
              ))}
            </select>
          </SettingRow>
          <SettingRow
            label="Exclude metronome/backing track"
            description="Reduces sensitivity to steady background click or accompaniment tracks."
          >
            <Toggle
              checked={profile.excludeMetronomeOrBackingTrack}
              onChange={(v) => updateProfile({ excludeMetronomeOrBackingTrack: v })}
              label="Exclude metronome or backing track"
            />
          </SettingRow>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Appearance</h2>
        <SettingRow label="Theme">
          <select
            value={preference}
            onChange={(e) => setPreference(e.target.value as "light" | "dark" | "system")}
            className="h-10 rounded-xl border border-border bg-surface px-2 text-sm"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </SettingRow>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Demo mode</h2>
        <p className="text-xs text-foreground-muted">
          Load five sample sessions (steady strumming, inconsistent timing, frequent pauses, uneven dynamics, and
          poor recording quality) generated from synthetic audio and run through the real analysis engine. Useful for
          exploring the app without a microphone. Demo sessions are always clearly labelled.
        </p>
        <Button variant="secondary" onClick={loadDemoSessions} disabled={generatingDemo}>
          {generatingDemo ? "Generating…" : "Load demo sessions"}
        </Button>
        {hasDemoSessions && (
          <Button variant="ghost" onClick={removeDemoSessions}>
            Remove demo sessions
          </Button>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Data</h2>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={exportAll}>
            Export all session data (JSON)
          </Button>
          <Button variant="danger" onClick={() => setConfirmingDeleteAll(true)}>
            Delete all data
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-2 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Privacy</h2>
        <p className="text-foreground-muted">
          Recordings and analysis stay on this device. Nothing is uploaded by default. Deleting a session removes its
          audio from local storage immediately. Please avoid recording other people without their permission.
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground-muted">App</h2>
        <Link href="/install" className="text-sm font-medium text-primary">
          Install FretCoach on your iPhone →
        </Link>
      </Card>

      <Card>
        <SettingRow label="Developer mode" description="Show raw analysis internals on session results.">
          <Toggle
            checked={profile.developerMode}
            onChange={(v) => updateProfile({ developerMode: v })}
            label="Developer mode"
          />
        </SettingRow>
      </Card>

      <ConfirmDialog
        open={confirmingDeleteAll}
        title="Delete all data?"
        description="This permanently deletes every saved session, recording, and note on this device. This cannot be undone."
        confirmLabel="Delete everything"
        destructive
        onConfirm={deleteAll}
        onCancel={() => setConfirmingDeleteAll(false)}
      />
    </PageContainer>
  );
}
