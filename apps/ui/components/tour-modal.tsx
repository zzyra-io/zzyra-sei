"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Lightbulb,
  Workflow,
  MousePointerClick,
  Link2,
  Settings,
  Rocket,
} from "lucide-react";

interface TourModalProps {
  tourMessages: string[];
  initialStep?: number;
  onComplete?: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TourModal({
  tourMessages,
  initialStep = 0,
  onComplete,
  isOpen,
  onOpenChange,
}: TourModalProps) {
  const [tourStep, setTourStep] = useState(initialStep);

  // Icons for each step
  const stepIcons = [
    <Lightbulb key='welcome' className='h-6 w-6' />,
    <MousePointerClick key='drag' className='h-6 w-6' />,
    <Link2 key='connect' className='h-6 w-6' />,
    <Settings key='configure' className='h-6 w-6' />,
    <Rocket key='deploy' className='h-6 w-6' />,
  ];

  // Handle ESC key press to close the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onOpenChange(false);
      } else if (e.key === "ArrowRight" && isOpen) {
        nextStep();
      } else if (e.key === "ArrowLeft" && isOpen) {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange, tourStep]);

  const nextStep = () => {
    if (tourStep < tourMessages.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (tourStep > 0) {
      setTourStep(tourStep - 1);
    }
  };

  const endTour = () => {
    onOpenChange(false);
    if (onComplete) onComplete();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className='fixed inset-0 z-50 flex items-center justify-center p-4 font-sans'
          role='dialog'
          aria-modal='true'
          aria-labelledby='tour-title'>
          {/* Backdrop with blur effect */}
          <motion.div
            className='absolute inset-0 bg-black/40 backdrop-blur-sm'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Modal */}
          <motion.div
            className='relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-800'
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}>
            {/* Close button (absolute positioned) */}
            <Button
              size='icon'
              variant='ghost'
              onClick={endTour}
              className='absolute right-3 top-3 z-10 h-8 w-8 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
              <X className='h-4 w-4' />
              <span className='sr-only'>Close</span>
            </Button>

            {/* Header with gradient */}
            <div className='bg-gradient-to-r from-violet-500 to-indigo-600 p-6 pb-8'>
              <div className='flex items-center mb-2'>
                <div className='bg-white/20 p-2 rounded-lg mr-3'>
                  <Workflow className='text-white h-5 w-5' />
                </div>
                <h2
                  id='tour-title'
                  className='text-xl font-semibold text-white'>
                  Workflow Builder Tour
                </h2>
              </div>
              <p className='text-white/80 text-sm'>
                Learn how to create powerful automation workflows in just a few
                steps
              </p>
            </div>

            {/* Content with negative margin for overlap effect */}
            <div className='px-6 pb-6 -mt-4'>
              <div className='bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-5'>
                <div className='flex items-start mb-4'>
                  <div className='mr-4 mt-1 bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400'>
                    {stepIcons[tourStep]}
                  </div>
                  <AnimatePresence mode='wait'>
                    <motion.div
                      key={tourStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className='flex-1'>
                      <h3 className='font-medium text-gray-900 dark:text-gray-100 mb-1.5'>
                        Step {tourStep + 1}:{" "}
                        {
                          [
                            "Welcome",
                            "Drag Components",
                            "Connect Nodes",
                            "Configure Settings",
                            "Deploy",
                          ][tourStep]
                        }
                      </h3>
                      <p className='text-gray-600 dark:text-gray-300 text-sm leading-relaxed'>
                        {tourMessages[tourStep]}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Progress indicator */}
                <div className='flex items-center justify-between mt-6 mb-1'>
                  <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    {tourStep + 1} of {tourMessages.length}
                  </span>
                  <div className='flex items-center space-x-1.5 flex-1 ml-4'>
                    {tourMessages.map((_, index) => (
                      <motion.button
                        key={index}
                        className={`h-1.5 rounded-full cursor-pointer ${
                          index === tourStep
                            ? "bg-indigo-500"
                            : index < tourStep
                            ? "bg-indigo-200 dark:bg-indigo-800"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                        style={{
                          width: index === tourStep ? "2rem" : "0.75rem",
                        }}
                        initial={false}
                        animate={{
                          width: index === tourStep ? "2rem" : "0.75rem",
                          backgroundColor:
                            index === tourStep
                              ? "#6366f1" // indigo-500
                              : index < tourStep
                              ? "#c7d2fe" // indigo-200
                              : "#e5e7eb", // gray-200
                        }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setTourStep(index)}
                        aria-label={`Go to step ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className='flex justify-between items-center'>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={endTour}
                  className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm'>
                  Skip tour
                </Button>
                <div className='flex space-x-2'>
                  {tourStep > 0 && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={prevStep}
                      className='px-3 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                      <ChevronLeft className='mr-1 h-4 w-4' />
                      Back
                    </Button>
                  )}
                  <Button
                    size='sm'
                    onClick={nextStep}
                    className='bg-indigo-600 hover:bg-indigo-700 text-white px-4 transition-colors'>
                    {tourStep < tourMessages.length - 1 ? (
                      <motion.div
                        className='flex items-center'
                        whileHover={{ x: 2 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}>
                        Next
                        <ChevronRight className='ml-1 h-4 w-4' />
                      </motion.div>
                    ) : (
                      "Finish"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
