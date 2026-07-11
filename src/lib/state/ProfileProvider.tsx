"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_USER_PROFILE, type UserPracticeProfile } from "@/lib/types";

const STORAGE_KEY = "fretcoach-profile";

interface ProfileContextValue {
  profile: UserPracticeProfile;
  updateProfile: (patch: Partial<UserPracticeProfile>) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserPracticeProfile>(DEFAULT_USER_PROFILE);

  useEffect(() => {
    // As in ThemeProvider: localStorage is only readable after mount, so
    // applying it here (post-hydration) rather than in a useState
    // initializer is what keeps server and first-client render in sync.
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile({ ...DEFAULT_USER_PROFILE, ...JSON.parse(stored) });
      }
    } catch {
      // Ignore corrupt local storage; fall back to defaults.
    }
  }, []);

  const updateProfile = (patch: Partial<UserPracticeProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return <ProfileContext.Provider value={{ profile, updateProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
