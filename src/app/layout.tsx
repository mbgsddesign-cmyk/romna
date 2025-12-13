import type { Metadata, Viewport } from "next";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { Providers } from "@/components/providers";
import { BottomNav } from "@/components/bottom-nav";
import { AskRomnaButton } from "@/components/ask-romna-button";
import { AskRomnaDrawer } from "@/components/ask-romna-drawer";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "ROMNA - AI Productivity Assistant",
  description: "Transform your voice into tasks, events, and emails",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ROMNA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F4F6" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0D0F" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground">
        <Providers>
          <main className="flex-1 pb-20">
            {children}
          </main>
          <BottomNav />
          <AskRomnaButton />
          <AskRomnaDrawer />
          <Toaster 
            position="top-center" 
            richColors 
            closeButton 
            toastOptions={{
              style: {
                borderRadius: '14px',
                fontFamily: 'var(--font-family)',
              },
            }}
          />
        </Providers>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}