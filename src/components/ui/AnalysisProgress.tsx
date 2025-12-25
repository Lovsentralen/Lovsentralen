"use client";

import { useState, useEffect } from "react";

interface AnalysisProgressProps {
  isActive: boolean;
}

const ANALYSIS_STEPS = [
  { id: 1, label: "Identifiserer juridiske problemstillinger", duration: 3000 },
  { id: 2, label: "Søker i norske rettskilder", duration: 8000 },
  { id: 3, label: "Henter og analyserer lovtekster", duration: 10000 },
  { id: 4, label: "Genererer tilpasset analyse", duration: 12000 },
  { id: 5, label: "Ferdigstiller resultat", duration: 3000 },
];

export function AnalysisProgress({ isActive }: AnalysisProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setProgress(0);
      setStepProgress(0);
      return;
    }

    // Progress within current step
    const stepInterval = setInterval(() => {
      setStepProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, ANALYSIS_STEPS[currentStep]?.duration / 50 || 100);

    return () => clearInterval(stepInterval);
  }, [isActive, currentStep]);

  useEffect(() => {
    if (!isActive) return;

    // Move to next step when current step is complete
    if (stepProgress >= 100 && currentStep < ANALYSIS_STEPS.length - 1) {
      const timeout = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setStepProgress(0);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [stepProgress, currentStep, isActive]);

  useEffect(() => {
    // Calculate overall progress
    const completedSteps = currentStep;
    const stepWeight = 100 / ANALYSIS_STEPS.length;
    const overallProgress = (completedSteps * stepWeight) + (stepProgress / ANALYSIS_STEPS.length);
    setProgress(Math.min(overallProgress, 95)); // Cap at 95% until actually complete
  }, [currentStep, stepProgress]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-amber-600 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Analyserer din sak
          </h2>
          <p className="text-slate-600">
            Vi søker gjennom norske rettskilder for å gi deg en presis analyse
          </p>
        </div>

        {/* Main progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Fremgang</span>
            <span className="font-semibold text-amber-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {ANALYSIS_STEPS.map((step, index) => {
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  isCurrent
                    ? "bg-amber-50 border border-amber-200"
                    : isComplete
                    ? "bg-green-50"
                    : "bg-slate-50"
                }`}
              >
                {/* Step indicator */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isComplete
                      ? "bg-green-500 text-white"
                      : isCurrent
                      ? "bg-amber-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>

                {/* Step label */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      isComplete
                        ? "text-green-700"
                        : isCurrent
                        ? "text-amber-700"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <div className="mt-1.5 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-100"
                        style={{ width: `${stepProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Status */}
                {isComplete && (
                  <span className="text-xs text-green-600 font-medium">Fullført</span>
                )}
                {isCurrent && (
                  <span className="text-xs text-amber-600 font-medium">Pågår...</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer message */}
        <p className="text-center text-sm text-slate-500 mt-6">
          ⏱️ Dette tar vanligvis 30-60 sekunder
        </p>
      </div>
    </div>
  );
}

