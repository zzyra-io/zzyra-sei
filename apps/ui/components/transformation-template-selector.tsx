import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Star,
  Play,
  Eye,
  Tag,
  Zap,
  Filter,
  TrendingUp
} from "lucide-react";
import {
  TRANSFORMATION_TEMPLATES,
  TransformationTemplate,
  getTemplatesByCategory,
  getTemplatesByTag,
  searchTemplates,
  getPopularTemplates,
  getTemplateById
} from "@zzyra/types/src/templates/transformation-templates";

interface TransformationTemplateSelectorProps {
  onApplyTemplate: (transformations: any[]) => void;
  currentTransformations?: any[];
  className?: string;
}

export function TransformationTemplateSelector({
  onApplyTemplate,
  currentTransformations = [],
  className
}: TransformationTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<TransformationTemplate | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "api", label: "API Processing" },
    { value: "data-processing", label: "Data Processing" },
    { value: "formatting", label: "Formatting" },
    { value: "validation", label: "Validation" },
    { value: "aggregation", label: "Aggregation" },
    { value: "finance", label: "Finance" },
    { value: "utility", label: "Utility" }
  ];

  const filteredTemplates = useMemo(() => {
    let templates = Object.values(TRANSFORMATION_TEMPLATES);

    // Filter by search query
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    // Filter by category
    if (selectedCategory !== "all") {
      templates = templates.filter(template => template.category === selectedCategory);
    }

    return templates;
  }, [searchQuery, selectedCategory]);

  const popularTemplates = useMemo(() => getPopularTemplates(4), []);

  const applyTemplate = (template: TransformationTemplate) => {
    // Apply template transformations
    onApplyTemplate(template.transformations);
  };

  const previewTemplate = (template: TransformationTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'api': return <Zap className="w-4 h-4" />;
      case 'data-processing': return <Filter className="w-4 h-4" />;
      case 'finance': return <TrendingUp className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  return (
    <div className={className}>
      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Browse Templates</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={() => applyTemplate(template)}
                onPreview={() => previewTemplate(template)}
                getDifficultyColor={getDifficultyColor}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No templates found</p>
              <p className="text-sm">Try adjusting your search or category filter</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="popular" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={() => applyTemplate(template)}
                onPreview={() => previewTemplate(template)}
                getDifficultyColor={getDifficultyColor}
                getCategoryIcon={getCategoryIcon}
                showPopularBadge
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedTemplate && getCategoryIcon(selectedTemplate.category)}
              <span>{selectedTemplate?.name}</span>
              <Badge className={getDifficultyColor(selectedTemplate?.difficulty || 'beginner')}>
                {selectedTemplate?.difficulty}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Transformations */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Transformations</Label>
                <div className="space-y-2">
                  {selectedTemplate.transformations.map((transform, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline">{transform.type}</Badge>
                        <span className="text-sm text-gray-600">Step {index + 1}</span>
                      </div>
                      <p className="text-sm">{transform.operation || 'Custom operation'}</p>
                      {transform.field && (
                        <p className="text-xs text-gray-500">
                          Field: {transform.field}
                          {transform.outputField && ` → ${transform.outputField}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Example */}
              {selectedTemplate.exampleInput && selectedTemplate.exampleOutput && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Example Input</Label>
                    <pre className="p-3 bg-gray-50 rounded-lg text-sm overflow-auto max-h-40">
                      {JSON.stringify(selectedTemplate.exampleInput, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Example Output</Label>
                    <pre className="p-3 bg-green-50 rounded-lg text-sm overflow-auto max-h-40">
                      {JSON.stringify(selectedTemplate.exampleOutput, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Apply Button */}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    applyTemplate(selectedTemplate);
                    setPreviewDialogOpen(false);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Apply Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateCardProps {
  template: TransformationTemplate;
  onApply: () => void;
  onPreview: () => void;
  getDifficultyColor: (difficulty: string) => string;
  getCategoryIcon: (category: string) => React.ReactNode;
  showPopularBadge?: boolean;
}

function TemplateCard({
  template,
  onApply,
  onPreview,
  getDifficultyColor,
  getCategoryIcon,
  showPopularBadge
}: TemplateCardProps) {
  return (
    <Card className="relative">
      {showPopularBadge && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs">
            <Star className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(template.category)}
            <CardTitle className="text-base">{template.name}</CardTitle>
          </div>
          <Badge className={getDifficultyColor(template.difficulty)}>
            {template.difficulty}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">{template.description}</p>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {template.transformations.length} transformation{template.transformations.length !== 1 ? 's' : ''}
            </span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button size="sm" onClick={onApply}>
                <Play className="w-4 h-4 mr-1" />
                Apply
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}