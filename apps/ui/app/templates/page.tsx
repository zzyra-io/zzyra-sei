"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { TemplateCard } from "@/components/template-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import type { WorkflowTemplate } from "@/lib/services/template-service";
import { templateService } from "@/lib/services/template-service";
import { Filter, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [templatesData, categoriesData] = await Promise.all([
          templateService.getTemplates(),
          templateService.getCategories(),
        ]);
        setTemplates(templatesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast({
          title: "Error fetching templates",
          description: "Failed to load workflow templates.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const filteredTemplates = templates.filter((template) => {
    // Filter by search query
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Filter by category
    const matchesCategory =
      activeCategory === "all" || template.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = async (templateId: string) => {
    try {
      const workflow =
        await templateService.createWorkflowFromTemplate(templateId);
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
    }
  };

  return (
    <>
      <div className='flex min-h-screen flex-col'>
        <DashboardHeader />
        <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            <div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
              <h1 className='text-2xl font-bold tracking-tight'>
                Workflow Templates
              </h1>
              <div className='flex items-center gap-2'>
                <div className='relative w-full sm:w-64'>
                  <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                  <Input
                    type='search'
                    placeholder='Search templates...'
                    className='pl-8'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Tabs
              defaultValue='all'
              value={activeCategory}
              onValueChange={setActiveCategory}
              className='space-y-4'>
              <div className='flex items-center justify-between'>
                <TabsList className='h-9'>
                  <TabsTrigger value='all' className='text-xs sm:text-sm'>
                    All Templates
                  </TabsTrigger>
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className='text-xs sm:text-sm capitalize'>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Button variant='outline' size='sm' className='hidden sm:flex'>
                  <Filter className='mr-2 h-4 w-4' />
                  Filters
                </Button>
              </div>

              <TabsContent value={activeCategory} className='mt-0'>
                {isLoading ? (
                  <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className='h-64 rounded-md' />
                    ))}
                  </div>
                ) : filteredTemplates.length > 0 ? (
                  <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onUse={() => handleUseTemplate(template.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className='flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center'>
                    <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
                      <Search className='h-6 w-6 text-primary' />
                    </div>
                    <h3 className='mt-4 text-lg font-semibold'>
                      No templates found
                    </h3>
                    <p className='mt-2 text-sm text-muted-foreground'>
                      {searchQuery
                        ? "No templates match your search criteria. Try a different search term."
                        : "No templates available in this category."}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </>
  );
}
