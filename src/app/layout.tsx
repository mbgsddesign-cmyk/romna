import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AutoGLMDecisionProvider } from "@/contexts/autoglm-decision-context";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: '--font-space' });

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={`${inter.className} antialiased min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-[#D9FD00] selection:text-black`}>
        <AuthProvider>
          <AutoGLMDecisionProvider>
            {children}
            <Toaster position="top-center" toastOptions={{
              style: {
                background: 'rgba(20, 20, 20, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
              }
            }} />
          </AutoGLMDecisionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}