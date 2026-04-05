"use client";

import { useState } from "react";
import { BookOpen, TrendingUp, Filter, History, PieChart, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEARNING_PATH } from "@/lib/learning/path";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="h-12 w-12" />,
  TrendingUp: <TrendingUp className="h-12 w-12" />,
  Filter: <Filter className="h-12 w-12" />,
  History: <History className="h-12 w-12" />,
  PieChart: <PieChart className="h-12 w-12" />,
  Rocket: <Rocket className="h-12 w-12" />,
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = LEARNING_PATH[currentStep];
  const isLastStep = currentStep === LEARNING_PATH.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex justify-center gap-2">
          {LEARNING_PATH.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index <= currentStep ? "bg-blue-500" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 text-blue-500">{iconMap[step.icon]}</div>
          <h2 className="mb-3 text-2xl font-bold text-gray-900">{step.title}</h2>
          <p className="mb-8 text-gray-600">{step.description}</p>

          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
            >
              跳过引导
            </Button>
            <Button
              className="flex-1"
              onClick={handleNext}
            >
              {step.actionText}
            </Button>
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-400">
          {currentStep + 1} / {LEARNING_PATH.length}
        </div>
      </div>
    </div>
  );
}
