"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2, Copy, Save } from "lucide-react";

interface UpdateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (
    name: string,
    description: string,
    tags: string[]
  ) => Promise<void>;
  onSaveAsNew: (
    name: string,
    description: string,
    tags: string[]
  ) => Promise<void>;
  currentName: string;
  currentDescription: string;
  currentTags: string[];
}

export function UpdateWorkflowDialog({
  open,
  onOpenChange,
  onUpdate,
  onSaveAsNew,
  currentName,
  currentDescription,
  currentTags,
}: UpdateWorkflowDialogProps) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription);
  const [tags, setTags] = useState<string[]>(currentTags);
  const [tagInput, setTagInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingAsNew, setIsSavingAsNew] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {}
  );

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateForm = () => {
    const newErrors: { name?: string; description?: string } = {};
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    setIsUpdating(true);
    try {
      await onUpdate(name, description, tags);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!validateForm()) return;

    setIsSavingAsNew(true);
    try {
      await onSaveAsNew(name, description, tags);
    } finally {
      setIsSavingAsNew(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Update Workflow</DialogTitle>
          <DialogDescription>
            Update your existing workflow or save it as a new workflow.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='name' className='flex items-center'>
              Name <span className='text-red-500 ml-1'>*</span>
            </Label>
            <Input
              id='name'
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              placeholder='My Awesome Workflow'
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className='text-xs text-red-500'>{errors.name}</p>
            )}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description)
                  setErrors({ ...errors, description: undefined });
              }}
              placeholder='Describe what this workflow does...'
              rows={3}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className='text-xs text-red-500'>{errors.description}</p>
            )}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='tags'>Tags (up to 5)</Label>
            <div className='flex items-center space-x-2'>
              <Input
                id='tags'
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder='Add tags...'
                onKeyDown={handleKeyDown}
                disabled={tags.length >= 5}
              />
              <Button
                type='button'
                size='sm'
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5}>
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            <div className='flex flex-wrap gap-2 mt-2'>
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant='secondary'
                  className='flex items-center gap-1'>
                  {tag}
                  <button
                    type='button'
                    onClick={() => handleRemoveTag(tag)}
                    className='rounded-full hover:bg-muted p-0.5'>
                    <X className='h-3 w-3' />
                  </button>
                </Badge>
              ))}
              {tags.length === 0 && (
                <span className='text-xs text-muted-foreground'>
                  No tags added yet
                </span>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className='flex justify-between'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isUpdating || isSavingAsNew}>
            Cancel
          </Button>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={handleSaveAsNew}
              disabled={isUpdating || isSavingAsNew}>
              {isSavingAsNew ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving as New...
                </>
              ) : (
                <>
                  <Copy className='mr-2 h-4 w-4' />
                  Save as New
                </>
              )}
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isUpdating || isSavingAsNew}>
              {isUpdating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Updating...
                </>
              ) : (
                <>
                  <Save className='mr-2 h-4 w-4' />
                  Update Workflow
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
