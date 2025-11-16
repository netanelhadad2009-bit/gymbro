import "./globals.css";
import "./safe-area.css";
import { Assistant } from "next/font/google";
import { GenderProvider } from "@/contexts/GenderContext";
import { AuthProvider } from "@/contexts/AuthProvider";
import { PlatformProvider } from "@/lib/platform";
import { Toaster } from "@/components/ui/toaster";
import MobileBoot from "./mobile-boot";
import { ClientLayout } from "@/components/ClientLayout";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata = {
  title: "FitJourney Web",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} font-sans min-h-[100dvh] bg-[#0b0d0e]`}>
      <head>
        {/* Theme color for iOS/Android status bar - matches header background */}
        <meta name="theme-color" content="#0b0d0e" />

        {/* Apple PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <meta name="color-scheme" content="dark light" />
      </head>
      <body className={`${assistant.className} font-sans bg-[#0b0d0e] text-white antialiased`}>
        <ClientLayout>
          <PlatformProvider>
            <MobileBoot>
              <AuthProvider>
                <GenderProvider>
                  {children}
                  <Toaster />
                </GenderProvider>
              </AuthProvider>
            </MobileBoot>
          </PlatformProvider>
        </ClientLayout>
      </body>
    </html>
  );
}
