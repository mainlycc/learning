import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AIRSET - Ochrona Lotnictwa Cywilnego",
  description: "Platforma szkoleniowa dla ochrony lotnictwa cywilnego",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Pobierz użytkownika, aby zdecydować czy renderować AppShell (sidebar/topbar)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile: {
    id: string;
    email: string;
    full_name: string | null;
    role: 'super_admin' | 'admin' | 'user';
  } | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    userProfile = profile || {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || null,
      role: 'user',
    };
  }

  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Jeśli użytkownik jest zalogowany, renderujemy globalny AppShell */}
          <AppShell user={userProfile}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
