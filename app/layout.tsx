import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "タスク管理ツール",
  description: "個人〜小規模チーム向けタスク管理ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
      return (
        <html lang="ja">
          <body className={inter.className}>
            <ThemeProvider>
              <Providers>{children}</Providers>
            </ThemeProvider>
          </body>
        </html>
      );
}

