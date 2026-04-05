"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const completed = localStorage.getItem("onboarding_completed");
    const isOnboardingPage = pathname === "/onboarding";

    if (completed !== "true" && !isOnboardingPage) {
      router.push("/onboarding");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
