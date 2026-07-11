import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/state/ThemeProvider";
import { ProfileProvider } from "@/lib/state/ProfileProvider";
import { AppChrome } from "@/components/ui/AppChrome";
import { ServiceWorkerRegister } from "@/components/ui/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "FretCoach",
  description: "An AI-assisted guitar practice diary: record, get evidence-based coaching, and track your progress.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FretCoach",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#171310" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          <ProfileProvider>
            <ServiceWorkerRegister />
            <AppChrome>{children}</AppChrome>
          </ProfileProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
