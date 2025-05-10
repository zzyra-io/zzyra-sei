"use client";
import type React from "react";
import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface FeedbackFormProps {
  onSuccess: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSuccess }) => {
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating, message }),
      });

      if (res.ok) {
        setMessage("");
        setRating(5);
        onSuccess();
      } else {
        console.error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          onClick={() => setRating(i + 1)}
          className={`h-6 w-6 cursor-pointer ${
            i < currentRating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ));
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <Label htmlFor='rating'>Rating</Label>
        <div className='flex items-center gap-2 mt-2'>
          {renderStars(rating)}
        </div>
        <Slider
          id='rating'
          defaultValue={[rating]}
          max={5}
          min={1}
          step={1}
          onValueChange={(value) => setRating(value[0])}
          className='w-full mt-2'
        />
      </div>
      <div>
        <Label htmlFor='message'>Message (optional)</Label>
        <Textarea
          id='message'
          placeholder='Tell us more about your experience'
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <Button disabled={submitting} type='submit'>
        {submitting ? "Submitting..." : "Submit Feedback"}
      </Button>
    </form>
  );
};
