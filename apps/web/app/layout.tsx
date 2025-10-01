export const metadata = { title: "GymBro Web" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>{children}</body>
    </html>
  );
}
