import "./globals.css";
import "./safe-area.css";
import { Assistant } from "next/font/google";
import { GenderProvider } from "@/contexts/GenderContext";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata = {
  title: "GymBro Web",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} font-sans`}>
      <head>
        {/* Viewport with viewport-fit=cover to enable safe area insets */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* Theme color for iOS/Android status bar - matches header background */}
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0D0E0F" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#0D0E0F" />

        {/* Apple PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <meta name="color-scheme" content="dark light" />
      </head>
      <body className={`${assistant.className} font-sans bg-[#0D0E0F] text-white antialiased`}>
        <GenderProvider>
          {children}
        </GenderProvider>
      </body>
    </html>
  );
}
