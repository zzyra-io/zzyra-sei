"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  templateService,
  WorkflowTemplate,
} from "@/lib/services/template-service";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown } from "lucide-react";

export default function TemplateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsing, setIsUsing] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const t = await templateService.getTemplate(params.id as string);
        if (!t) {
          setError("Template not found");
        } else {
          setTemplate(t);
        }
      } catch (err) {
        setError("Failed to load template");
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) fetchTemplate();
  }, [params.id]);

  const handleUseTemplate = async () => {
    if (!template) return;
    setIsUsing(true);
    try {
      const workflow = await templateService.createWorkflowFromTemplate(
        template.id
      );
      toast({
        title: "Template applied",
        description: "Workflow created successfully from template.",
      });
      router.push(`/builder?id=${workflow.id}`);
    } catch (error) {
      toast({
        title: "Error applying template",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create workflow from template.",
        variant: "destructive",
      });
    } finally {
      setIsUsing(false);
    }
  };

  if (isLoading) {
    return (
      <div className='max-w-3xl mx-auto py-12 px-4'>
        <Skeleton className='h-8 w-1/2 mb-4' />
        <Skeleton className='h-6 w-1/3 mb-2' />
        <Skeleton className='h-24 w-full mb-6' />
        <Skeleton className='h-10 w-32' />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className='max-w-2xl mx-auto py-12 px-4 text-center'>
        <h2 className='text-xl font-semibold mb-2'>
          {error || "Template not found"}
        </h2>
        <Button variant='outline' onClick={() => router.back()}>
          <ArrowLeft className='mr-2 h-4 w-4' /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className='max-w-3xl mx-auto py-12 px-4'>
      <Button variant='ghost' className='mb-4' onClick={() => router.back()}>
        <ArrowLeft className='mr-2 h-4 w-4' /> Back to Templates
      </Button>
      <div className='flex items-center gap-3 mb-2'>
        <h1 className='text-3xl font-bold line-clamp-2 flex-1'>
          {template.name}
        </h1>
        {template.is_premium && (
          <Badge variant='default' className='bg-amber-500 hover:bg-amber-600'>
            <Crown className='mr-1 h-3 w-3' /> Premium
          </Badge>
        )}
      </div>
      <div className='flex flex-wrap gap-2 mb-4'>
        <Badge variant='secondary' className='text-xs'>
          {template.category}
        </Badge>
        {template.tags &&
          template.tags.map((tag) => (
            <Badge key={tag} variant='secondary' className='text-xs'>
              {tag}
            </Badge>
          ))}
      </div>
      <p className='text-muted-foreground mb-6 text-lg whitespace-pre-line'>
        {template.description}
      </p>
      {/* Workflow preview placeholder */}
      <div className='mb-8'>
        <h3 className='font-semibold mb-2'>Workflow Preview</h3>
        <div className='rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground'>
          <div>Nodes: {template.nodes.length}</div>
          <div>Edges: {template.edges.length}</div>
          {/* Optionally render a visualization here */}
        </div>
      </div>
      {/* Customization fields placeholder */}
      {/* <div className="mb-8">
        <h3 className="font-semibold mb-2">Customization</h3>
        <div>Coming soon: configure parameters before using this template.</div>
      </div> */}
      <div className='flex gap-4'>
        <Button onClick={handleUseTemplate} disabled={isUsing} size='lg'>
          {template.is_premium ? "Buy Template" : "Use Template"}
        </Button>
        {/* Future: show price, purchase modal, etc. */}
      </div>
    </div>
  );
}
