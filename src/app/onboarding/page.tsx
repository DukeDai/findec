"use client";

import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/learning/OnboardingFlow";

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = () => {
    localStorage.setItem("onboarding_completed", "true");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingFlow onComplete={handleComplete} />
    </div>
  );
}
