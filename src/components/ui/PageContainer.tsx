import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="safe-top mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 pb-8 pt-6">
      {children}
    </main>
  );
}
