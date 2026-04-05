import type { Metadata } from "next";
import { Navigation, LearningModeProvider } from "@/components/layout/Navigation";
import { AlertNotificationBridge } from "@/components/dashboard/AlertNotificationBridge";
import { OnboardingGuard } from "@/components/learning/OnboardingGuard";
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
      <body className="min-h-full flex flex-col font-sans">
        <OnboardingGuard>
          <LearningModeProvider>
            <Navigation />
            <main className="flex-1">{children}</main>
            <AlertNotificationBridge />
          </LearningModeProvider>
        </OnboardingGuard>
      </body>
    </html>
  );
}
