import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Findec - 股票分析平台",
  description: "专业的股票分析和K线图表平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
