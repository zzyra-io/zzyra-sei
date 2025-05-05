"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { OpenRouterProvider } from '@/lib/ai-providers/openrouter'
import { saveBlock } from '@/lib/block-library-api'
import { BlockType } from '@/types/workflow'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArrowLeft, Loader2, Sparkles, Code, Terminal, PlusCircle, X, Save } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { AICustomBlockData } from '@/types/custom-block'
import { cn } from '@/lib/utils'

// Form schema for block creation
const blockFormSchema = z.object({
  name: z.string().min(3, {
    message: "Block name must be at least 3 characters.",
  }).max(50, {
    message: "Block name must not exceed 50 characters."
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }).max(200, {
    message: "Description must not exceed 200 characters."
  }),
  blockType: z.nativeEnum(BlockType),
  isPublic: z.boolean().default(false),
  prompt: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

export default function CreateBlockPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatedBlock, setGeneratedBlock] = useState<AICustomBlockData | null>(null)
  const [currentTag, setCurrentTag] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'config' | 'generate' | 'review'>('config')
  
  // Create form
  const form = useForm<z.infer<typeof blockFormSchema>>({
    resolver: zodResolver(blockFormSchema),
    defaultValues: {
      name: '',
      description: '',
      blockType: BlockType.DEFI_PRICE_MONITOR,
      isPublic: false,
      prompt: '',
      tags: [],
    },
  })
  
  const blockType = form.watch('blockType')
  const tags = form.watch('tags')
  
  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      form.setValue('tags', [...tags, currentTag.trim()])
      setCurrentTag('')
      
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }
  
  const removeTag = (tag: string) => {
    form.setValue('tags', tags.filter(t => t !== tag))
  }
  
  const handleGenerateBlock = async (data: z.infer<typeof blockFormSchema>) => {
    try {
      setGenerating(true)
      
      // Get current user ID for tracking purposes
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id || 'anonymous'
      
      // Create OpenRouter instance
      const openRouter = new OpenRouterProvider()
      
      // Generate block definition using AI
      const generatedBlock = await openRouter.generateDefiBlock({
        blockType: data.blockType,
        name: data.name,
        description: data.description,
        additionalContext: data.prompt || '',
        userId
      })
      
      if (!generatedBlock) {
        throw new Error('Failed to generate block')
      }
      
      setGeneratedBlock(generatedBlock)
      setStep('review')
      
      toast({
        title: 'Block generated',
        description: 'Your custom DeFi block has been generated. Review it before saving.',
      })
      
    } catch (error) {
      console.error('Error generating block:', error)
      toast({
        title: 'Generation failed',
        description: 'Failed to generate block. Please try again with a more detailed description.',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }
  
  const handleSaveBlock = async () => {
    if (!generatedBlock) return
    
    try {
      setSaving(true)
      
      const data = form.getValues()
      
      await saveBlock({
        blockData: generatedBlock,
        blockType: data.blockType,
        isPublic: data.isPublic,
        tags: data.tags
      })
      
      toast({
        title: 'Block saved',
        description: 'Your custom DeFi block has been saved to your library.',
      })
      
      router.push('/blocks/library')
      
    } catch (error) {
      console.error('Error saving block:', error)
      toast({
        title: 'Save failed',
        description: 'Failed to save block to library. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  const getBlockTypeLabel = (type: BlockType) => {
    return type.replace('DEFI_', '').replace('_', ' ').toLowerCase()
  }
  
  const renderConfigStep = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => {
        setStep('generate')
      })} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Block Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Binance BTC Price Monitor" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for your custom block
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="e.g., Monitors Bitcoin price on Binance and sends alerts based on price thresholds" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                A clear description of what this block does
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="blockType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Block Type</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Object.values(BlockType)
                  .filter(type => type.startsWith('DEFI_'))
                  .map((type) => (
                    <div key={type} className="flex">
                      <Button
                        type="button"
                        variant={field.value === type ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          field.value === type && "text-primary-foreground"
                        )}
                        onClick={() => form.setValue('blockType', type as BlockType)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="capitalize">{getBlockTypeLabel(type)}</span>
                        </div>
                      </Button>
                    </div>
                  ))}
              </div>
              <FormDescription>
                Select the type of DeFi block you want to create
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs py-1">
                    {tag}
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-muted-foreground">No tags added</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="Enter tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addTag}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              <FormDescription>
                Add relevant tags to help others find your block
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Make Public
                </FormLabel>
                <FormDescription>
                  Allow others to discover and use this block
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/blocks/library')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit">
            Continue
          </Button>
        </div>
      </form>
    </Form>
  )
  
  const renderGenerateStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Generate DeFi Block</h2>
        <p className="text-muted-foreground">
          Provide additional details to help AI generate your block
        </p>
      </div>
      
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>AI-Powered Block Generation</AlertTitle>
        <AlertDescription>
          We'll use AI to generate a custom DeFi block based on your specifications.
          Add any additional details that might help create a better block.
        </AlertDescription>
      </Alert>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleGenerateBlock)} className="space-y-6">
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Details (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="e.g., I want this block to monitor BTC/USDT price on Binance, trigger alerts when price crosses above $50k or below $40k, and include a 24h price change percentage..." 
                    className="h-32"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Provide any specific requirements or features you want in your block
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Block Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-medium">Name:</dt>
                  <dd>{form.getValues('name')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Type:</dt>
                  <dd className="capitalize">{getBlockTypeLabel(form.getValues('blockType'))}</dd>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.getValues('tags').map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </dl>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('config')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Block
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
  
  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Review and Save</h2>
        <p className="text-muted-foreground">
          Review your generated block before saving it to your library
        </p>
      </div>
      
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>AI-Generated Block</AlertTitle>
        <AlertDescription>
          This block was generated based on your specifications. You can save it to your library or go back to modify your request.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="preview">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{form.getValues('name')}</CardTitle>
              <CardDescription>{form.getValues('description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Type</div>
                  <Badge variant="outline" className="capitalize">
                    {getBlockTypeLabel(form.getValues('blockType'))}
                  </Badge>
                </div>
                
                {form.getValues('tags').length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {form.getValues('tags').map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {generatedBlock?.configuration && (
                  <div>
                    <div className="text-sm font-medium mb-1">Configuration</div>
                    <div className="bg-muted rounded-md p-3 overflow-auto max-h-60">
                      <pre className="text-xs">
                        {JSON.stringify(generatedBlock.configuration, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Block Code
              </CardTitle>
              <CardDescription>
                Generated code that will be executed when this block runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-3 overflow-auto max-h-[400px]">
                <pre className="text-xs">
                  {generatedBlock?.executionCode || 'No code generated'}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep('generate')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleSaveBlock} 
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save to Library
            </>
          )}
        </Button>
      </div>
    </div>
  )
  
  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div className="mb-4">
        <Link href="/blocks/library" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Link>
      </div>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Custom Block</h1>
        <p className="text-muted-foreground">Create an AI-powered custom DeFi block for your workflows</p>
      </div>
      
      <div className="relative">
        <div className="absolute left-0 top-0 w-full flex justify-center">
          <ol className="flex w-full max-w-md items-center text-sm font-medium text-center text-muted-foreground">
            <li className={cn(
              "flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-muted-foreground/30 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10",
              step !== 'config' && "after:border-primary"
            )}>
              <span className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                step === 'config' ? "bg-primary text-white" : "bg-primary"
              )}>1</span>
            </li>
            <li className={cn(
              "flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-muted-foreground/30 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10",
              step === 'review' && "after:border-primary"
            )}>
              <span className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                step === 'config' ? "border border-muted-foreground/30" : step === 'generate' ? "bg-primary text-white" : "bg-primary"
              )}>2</span>
            </li>
            <li>
              <span className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                step === 'review' ? "bg-primary text-white" : "border border-muted-foreground/30"
              )}>3</span>
            </li>
          </ol>
        </div>
        
        <div className="pt-16">
          <Card>
            <CardContent className="pt-6 pb-8">
              {step === 'config' && renderConfigStep()}
              {step === 'generate' && renderGenerateStep()}
              {step === 'review' && renderReviewStep()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
