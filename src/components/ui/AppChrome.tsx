"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

const HIDE_NAV_PREFIXES = ["/record"];

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNav = HIDE_NAV_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <div className="flex min-h-dvh flex-col">
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}
