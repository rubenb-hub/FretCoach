"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";

function useStandaloneMode(): boolean {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    // display-mode is only knowable client-side post-mount; computing it
    // in a useState initializer would run during server rendering (where
    // `window` doesn't exist) and mismatch the client's first render.
    const nav = navigator as Navigator & { standalone?: boolean };
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStandalone(isStandalone);
  }, []);
  return standalone;
}

export default function InstallPage() {
  const standalone = useStandaloneMode();

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Install FretCoach</h1>
      <p className="text-sm text-foreground-muted">
        Installing FretCoach adds it to your home screen like a native app: it opens full-screen, without
        Safari&apos;s address bar, and previously saved sessions stay available offline.
      </p>

      {standalone && (
        <Card className="bg-accent/10 text-accent">
          <p className="text-sm font-medium">You&apos;re already using the installed app. Nothing else to do.</p>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">On iPhone (Safari)</h2>
        <ol className="flex flex-col gap-3 text-sm">
          <Step number={1}>Open FretCoach in Safari (not Chrome or another browser — the install option only appears in Safari on iOS).</Step>
          <Step number={2}>
            Tap the <strong>Share</strong> icon (a square with an arrow pointing up) in the toolbar.
          </Step>
          <Step number={3}>
            Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.
          </Step>
          <Step number={4}>Confirm the name and tap Add — FretCoach now appears as an icon on your home screen.</Step>
        </ol>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">On Android (Chrome)</h2>
        <ol className="flex flex-col gap-3 text-sm">
          <Step number={1}>Open FretCoach in Chrome.</Step>
          <Step number={2}>Tap the ⋮ menu in the top-right corner.</Step>
          <Step number={3}>
            Tap <strong>Add to Home screen</strong>, then confirm.
          </Step>
        </ol>
      </Card>

      <Card className="text-sm text-foreground-muted">
        FretCoach works fully in a regular browser tab too — installing is optional and just makes it quicker to
        reach and feel more like a dedicated app.
      </Card>
    </PageContainer>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {number}
      </span>
      <span>{children}</span>
    </li>
  );
}
