"use client";

import React, { useState } from "react";
import { Star, MessageSquare, Send, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { submitFeedback as submitFeedbackApi } from "@/lib/api/enhanced-workflow-generation";

interface FeedbackCollectorProps {
  feedbackType?:
    | "workflow_generation"
    | "block_generation"
    | "validation"
    | "general";
  generationPrompt?: string;
  generatedOutput?: unknown;
  executionResult?: "success" | "failure" | "partial";
  onFeedbackSubmitted?: (feedbackId: string) => void;
  className?: string;
  compact?: boolean;
}

const StarRating = ({
  rating,
  onRatingChange,
  size = "h-6 w-6",
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: string;
}) => {
  return (
    <div className='flex space-x-1'>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size,
            "cursor-pointer transition-colors",
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 hover:text-yellow-400"
          )}
          onClick={() => onRatingChange(star)}
        />
      ))}
    </div>
  );
};

const QuickFeedback = ({
  onPositive,
  onNegative,
}: {
  onPositive: () => void;
  onNegative: () => void;
}) => (
  <div className='flex space-x-2'>
    <Button
      variant='outline'
      size='sm'
      onClick={onPositive}
      className='flex items-center space-x-1 text-green-600 hover:text-green-700 hover:bg-green-50'>
      <ThumbsUp className='h-4 w-4' />
      <span>Good</span>
    </Button>
    <Button
      variant='outline'
      size='sm'
      onClick={onNegative}
      className='flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50'>
      <ThumbsDown className='h-4 w-4' />
      <span>Poor</span>
    </Button>
  </div>
);

// Add type for feedback type
const FEEDBACK_TYPES = [
  "workflow_generation",
  "block_generation",
  "validation",
  "general",
] as const;
type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FeedbackCollector = React.memo<FeedbackCollectorProps>(
  ({
    feedbackType = "general",
    generationPrompt,
    generatedOutput,
    executionResult,
    onFeedbackSubmitted,
    className,
    compact = false,
  }) => {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [selectedType, setSelectedType] = useState<FeedbackType>(
      feedbackType || "workflow_generation"
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleQuickFeedback = (positive: boolean) => {
      setRating(positive ? 5 : 2);
      setFeedback(positive ? "Good experience" : "Needs improvement");
      handleSubmit(
        positive ? 5 : 2,
        positive ? "Good experience" : "Needs improvement"
      );
    };

    const handleSubmit = async (
      submitRating?: number,
      feedbackOverride?: string
    ) => {
      const finalRating = submitRating ?? rating;
      const finalFeedback = feedbackOverride ?? feedback;

      if (finalRating === 0) {
        setError("Please provide a rating");
        return;
      }

      if (finalRating <= 2 && !finalFeedback.trim()) {
        setError("Please provide feedback for low ratings");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const result = await submitFeedbackApi(
          selectedType,
          finalRating,
          finalFeedback,
          {
            generationPrompt,
            generatedOutput,
            executionResult,
          }
        );

        setSubmitted(true);
        onFeedbackSubmitted?.(result.feedbackId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to submit feedback"
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    if (submitted) {
      return (
        <Alert className={cn("border-green-200 bg-green-50", className)}>
          <MessageSquare className='h-4 w-4 text-green-600' />
          <AlertDescription className='text-green-800'>
            Thank you for your feedback! Your input helps us improve the system.
          </AlertDescription>
        </Alert>
      );
    }

    if (compact) {
      return (
        <Card className={className}>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <span className='text-sm font-medium'>
                  How was this generation?
                </span>
                <StarRating
                  rating={rating}
                  onRatingChange={setRating}
                  size='h-5 w-5'
                />
              </div>
              <QuickFeedback
                onPositive={() => handleQuickFeedback(true)}
                onNegative={() => handleQuickFeedback(false)}
              />
            </div>

            {rating > 0 && rating <= 3 && (
              <div className='mt-3 space-y-2'>
                <Textarea
                  placeholder='What could be improved?'
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className='text-sm'
                  rows={2}
                />
                <Button
                  size='sm'
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className='w-full'>
                  <Send className='h-3 w-3 mr-1' />
                  {isSubmitting ? "Submitting..." : "Send Feedback"}
                </Button>
              </div>
            )}

            {error && (
              <Alert className='mt-2 border-red-200 bg-red-50'>
                <AlertDescription className='text-red-800 text-sm'>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <MessageSquare className='h-5 w-5 mr-2' />
            Feedback
          </CardTitle>
          <CardDescription>
            Help us improve by sharing your experience
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <Label htmlFor='feedback-type'>Feedback Type</Label>
            <Select
              value={selectedType}
              onValueChange={(v: FeedbackType) => setSelectedType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='workflow_generation'>
                  Workflow Generation
                </SelectItem>
                <SelectItem value='block_generation'>
                  Block Generation
                </SelectItem>
                <SelectItem value='validation'>Validation</SelectItem>
                <SelectItem value='general'>General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Rating</Label>
            <div className='flex items-center space-x-2 mt-2'>
              <StarRating rating={rating} onRatingChange={setRating} />
              <span className='text-sm text-gray-600'>
                {rating === 0 && "Select a rating"}
                {rating === 1 && "Very Poor"}
                {rating === 2 && "Poor"}
                {rating === 3 && "Fair"}
                {rating === 4 && "Good"}
                {rating === 5 && "Excellent"}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor='feedback-text'>
              Feedback{" "}
              {rating > 0 && rating <= 2 && (
                <span className='text-red-500'>*</span>
              )}
            </Label>
            <Textarea
              id='feedback-text'
              placeholder={
                rating <= 2
                  ? "Please tell us what went wrong and how we can improve..."
                  : "Tell us about your experience (optional)..."
              }
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>

          {executionResult && (
            <div>
              <Label>Execution Result</Label>
              <div className='mt-2'>
                <RadioGroup value={executionResult} disabled>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='success' id='success' />
                    <Label htmlFor='success' className='text-sm'>
                      Success
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='partial' id='partial' />
                    <Label htmlFor='partial' className='text-sm'>
                      Partial Success
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='failure' id='failure' />
                    <Label htmlFor='failure' className='text-sm'>
                      Failure
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {error && (
            <Alert className='border-red-200 bg-red-50'>
              <AlertDescription className='text-red-800'>
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className='flex space-x-2'>
            <Button
              onClick={() => handleSubmit()}
              disabled={isSubmitting || rating === 0}
              className='flex-1'>
              <Send className='h-4 w-4 mr-2' />
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
            <QuickFeedback
              onPositive={() => handleQuickFeedback(true)}
              onNegative={() => handleQuickFeedback(false)}
            />
          </div>
        </CardContent>
      </Card>
    );
  }
);

FeedbackCollector.displayName = "FeedbackCollector";
