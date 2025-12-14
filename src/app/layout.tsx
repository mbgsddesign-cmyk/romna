import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Cairo } from "next/font/google"; // [FONT]
import { cookies } from 'next/headers'; // [RTL-FIX]
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AutoGLMDecisionProvider } from "@/contexts/autoglm-decision-context";
import { AppStateProvider } from "@/contexts/app-state-context";
import { GlobalErrorBoundary } from "@/components/error-boundary";
import { Toaster } from 'sonner';

import { BottomNav } from "@/components/bottom-nav";
import OnboardingOverlay from "@/components/onboarding-overlay";
import { DiagnosticsPanel } from "@/components/diagnostics-panel";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: '--font-space' });
const cairo = Cairo({ subsets: ["arabic"], variable: '--font-cairo' });

import { FeedbackListener } from "@/components/feedback-listener";

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
  themeColor: '#050505',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // [V6 RTL-FIX] Read locale from cookie server-side to prevent hydration mismatch
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('romna_locale');
  const locale = (localeCookie?.value === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${spaceGrotesk.variable} ${cairo.variable}`} suppressHydrationWarning={true}>
      <body className={`${inter.className} antialiased min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-[#D9FD00] selection:text-black`} suppressHydrationWarning={true}>
        <AuthProvider>
          <AutoGLMDecisionProvider>
            <AppStateProvider>
              <GlobalErrorBoundary>
                {children}
              </GlobalErrorBoundary>
            </AppStateProvider>
            <OnboardingOverlay />
            <FeedbackListener />
            <BottomNav />
            <Toaster position="top-center" toastOptions={{
              style: {
                background: 'rgba(20, 20, 20, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
              }
            }} />
            <DiagnosticsPanel />
          </AutoGLMDecisionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}