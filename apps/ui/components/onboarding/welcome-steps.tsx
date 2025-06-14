"use client";

import type React from "react";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, ChevronRight, Layers, Wallet, Zap } from "lucide-react";

interface StepProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: StepProps[] = [
  {
    title: "Welcome to Zzyra",
    description:
      "Your all-in-one platform for building powerful Web3 automation workflows with no-code required.",
    icon: <Zap className='h-12 w-12 text-primary' />,
  },
  {
    title: "Build Custom Workflows",
    description:
      "Drag and drop blocks to create custom workflows that automate your Web3 operations.",
    icon: <Layers className='h-12 w-12 text-primary' />,
  },
  {
    title: "Connect Your Wallet",
    description:
      "Securely connect your wallet to interact with blockchain features and automate transactions.",
    icon: <Wallet className='h-12 w-12 text-primary' />,
  },
];

export function WelcomeSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCompleted(true);
      // Store in localStorage that the user has completed onboarding
      localStorage.setItem("onboardingCompleted", "true");
    }
  };

  return (
    <Card className='w-full max-w-md mx-auto'>
      <CardHeader>
        <div className='flex justify-between items-center mb-2'>
          <div className='flex space-x-2'>
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-12 rounded-full ${
                  index <= currentStep ? "bg-primary" : "bg-muted"
                } transition-colors`}
              />
            ))}
          </div>
          <span className='text-sm text-muted-foreground'>
            {currentStep + 1} of {steps.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className='px-8 py-6'>
        <AnimatePresence mode='wait'>
          {!completed ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className='flex flex-col items-center text-center'>
              <div className='mb-6 p-4 rounded-full bg-primary/10'>
                {steps[currentStep].icon}
              </div>
              <CardTitle className='text-2xl mb-2'>
                {steps[currentStep].title}
              </CardTitle>
              <CardDescription className='text-base'>
                {steps[currentStep].description}
              </CardDescription>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className='flex flex-col items-center text-center'>
              <div className='mb-6 p-4 rounded-full bg-green-100 dark:bg-green-900/20'>
                <CheckCircle2 className='h-12 w-12 text-green-600 dark:text-green-500' />
              </div>
              <CardTitle className='text-2xl mb-2'>You're All Set!</CardTitle>
              <CardDescription className='text-base'>
                You're ready to start building powerful automation workflows
                with Zzyra.
              </CardDescription>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
      <CardFooter className='flex justify-center pb-8'>
        {!completed ? (
          <Button onClick={handleNext} className='w-full max-w-xs'>
            {currentStep < steps.length - 1 ? (
              <>
                Next <ChevronRight className='ml-2 h-4 w-4' />
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        ) : (
          <Button href='/dashboard' className='w-full max-w-xs'>
            Go to Dashboard
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
