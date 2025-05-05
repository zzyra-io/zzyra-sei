"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { PlusCircle, Trash2, MoveUp, MoveDown, Sparkles, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { type CustomBlockDefinition, type BlockParameter, DataType, LogicType } from "@/types/custom-block"
import { NodeCategory } from "@/types/workflow"
import { Loader2 } from "lucide-react"

// Import CodeMirror components for code editing
import { EditorView } from "@codemirror/view"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import CodeMirror from "@uiw/react-codemirror"

interface CustomBlockBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialBlock?: CustomBlockDefinition
  onSave: (block: CustomBlockDefinition) => void
  onGenerateWithAI?: (prompt: string, callback: (block: Partial<CustomBlockDefinition>) => void) => void
  /** When true, renders the dialog content directly without the Dialog wrapper (for embedding) */
  inline?: boolean
}

export function CustomBlockBuilderDialog({ open, onOpenChange, initialBlock, onSave, onGenerateWithAI, inline = false }: CustomBlockBuilderDialogProps) {
  const [activeTab, setActiveTab] = useState("general")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<NodeCategory>(NodeCategory.ACTION)
  const [isPublic, setIsPublic] = useState(false)
  const [inputs, setInputs] = useState<BlockParameter[]>([])
  const [outputs, setOutputs] = useState<BlockParameter[]>([])
  const [logicType, setLogicType] = useState<LogicType>(LogicType.JAVASCRIPT)
  const [logic, setLogic] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Reset form when dialog opens or initialBlock changes
  useEffect(() => {
    if (open) {
      if (initialBlock) {
        setName(initialBlock.name)
        setDescription(initialBlock.description)
        setCategory(initialBlock.category)
        setIsPublic(initialBlock.isPublic)
        setInputs(initialBlock.inputs)
        setOutputs(initialBlock.outputs)
        setLogicType(initialBlock.logicType)
        setLogic(initialBlock.logic)
        setTags(initialBlock.tags || [])
      } else {
        // Default values for new block
        setName("")
        setDescription("")
        setCategory(NodeCategory.ACTION)
        setIsPublic(false)
        setInputs([])
        setOutputs([])
        setLogicType(LogicType.JAVASCRIPT)
        setLogic("")
        setTags([])
      }
      setActiveTab("general")
    }
  }, [open, initialBlock])

  // Add a new input parameter
  const addInput = () => {
    const newInput: BlockParameter = {
      id: `input_${Date.now()}`,
      name: `input${inputs.length + 1}`,
      description: "",
      dataType: DataType.STRING,
      required: true,
    }
    setInputs([...inputs, newInput])
  }

  // Update an input parameter
  const updateInput = (index: number, updates: Partial<BlockParameter>) => {
    const updatedInputs = [...inputs]
    updatedInputs[index] = { ...updatedInputs[index], ...updates }
    setInputs(updatedInputs)
  }

  // Remove an input parameter
  const removeInput = (index: number) => {
    const updatedInputs = [...inputs]
    updatedInputs.splice(index, 1)
    setInputs(updatedInputs)
  }

  // Move an input parameter up
  const moveInputUp = (index: number) => {
    if (index === 0) return
    const updatedInputs = [...inputs]
    const temp = updatedInputs[index]
    updatedInputs[index] = updatedInputs[index - 1]
    updatedInputs[index - 1] = temp
    setInputs(updatedInputs)
  }

  // Move an input parameter down
  const moveInputDown = (index: number) => {
    if (index === inputs.length - 1) return
    const updatedInputs = [...inputs]
    const temp = updatedInputs[index]
    updatedInputs[index] = updatedInputs[index + 1]
    updatedInputs[index + 1] = temp
    setInputs(updatedInputs)
  }

  // Add a new output parameter
  const addOutput = () => {
    const newOutput: BlockParameter = {
      id: `output_${Date.now()}`,
      name: `output${outputs.length + 1}`,
      description: "",
      dataType: DataType.STRING,
      required: true,
    }
    setOutputs([...outputs, newOutput])
  }

  // Update an output parameter
  const updateOutput = (index: number, updates: Partial<BlockParameter>) => {
    const updatedOutputs = [...outputs]
    updatedOutputs[index] = { ...updatedOutputs[index], ...updates }
    setOutputs(updatedOutputs)
  }

  // Remove an output parameter
  const removeOutput = (index: number) => {
    const updatedOutputs = [...outputs]
    updatedOutputs.splice(index, 1)
    setOutputs(updatedOutputs)
  }

  // Move an output parameter up
  const moveOutputUp = (index: number) => {
    if (index === 0) return
    const updatedOutputs = [...outputs]
    const temp = updatedOutputs[index]
    updatedOutputs[index] = updatedOutputs[index - 1]
    updatedOutputs[index - 1] = temp
    setOutputs(updatedOutputs)
  }

  // Move an output parameter down
  const moveOutputDown = (index: number) => {
    if (index === outputs.length - 1) return
    const updatedOutputs = [...outputs]
    const temp = updatedOutputs[index]
    updatedOutputs[index] = updatedOutputs[index + 1]
    updatedOutputs[index + 1] = temp
    setOutputs(updatedOutputs)
  }

  // Add a tag
  const addTag = () => {
    if (!tagInput.trim()) return
    if (tags.includes(tagInput.trim())) {
      toast({
        title: "Tag already exists",
        description: "This tag is already added to the block.",
        variant: "destructive",
      })
      return
    }
    setTags([...tags, tagInput.trim()])
    setTagInput("")
  }

  // Remove a tag
  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  // Validate form and return errors
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    
    if (!name.trim()) {
      errors.name = "Name is required"
    }
    
    if (inputs.length === 0) {
      errors.inputs = "At least one input parameter is required"
    } else {
      // Check for duplicate input names
      const inputNames = inputs.map(input => input.name)
      const hasDuplicateInputs = inputNames.some((name, index) => 
        inputNames.indexOf(name) !== index
      )
      if (hasDuplicateInputs) {
        errors.inputs = "Input parameter names must be unique"
      }
    }
    
    if (outputs.length === 0) {
      errors.outputs = "At least one output parameter is required"
    } else {
      // Check for duplicate output names
      const outputNames = outputs.map(output => output.name)
      const hasDuplicateOutputs = outputNames.some((name, index) => 
        outputNames.indexOf(name) !== index
      )
      if (hasDuplicateOutputs) {
        errors.outputs = "Output parameter names must be unique"
      }
    }
    
    if (!logic.trim()) {
      errors.logic = "Logic is required"
    } else {
      // Basic validation based on logic type
      try {
        if (logicType === LogicType.JAVASCRIPT) {
          // Check if it contains a function declaration
          if (!logic.includes('function process') && !logic.includes('const process =') && !logic.includes('let process =')) {
            errors.logic = "JavaScript logic must include a 'process' function"
          }
        } else if (logicType === LogicType.JSON_TRANSFORM) {
          // Try parsing as JSON
          JSON.parse(logic)
        }
      } catch (e) {
        errors.logic = logicType === LogicType.JSON_TRANSFORM 
          ? "Invalid JSON format" 
          : "Logic validation failed"
      }
    }
    
    return errors
  }

  // Handle form submission
  const handleSave = () => {
    // Validate form
    const errors = validateForm()
    setValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      // Show toast for the first error
      const firstError = Object.entries(errors)[0]
      toast({
        title: firstError[0].charAt(0).toUpperCase() + firstError[0].slice(1) + " error",
        description: firstError[1],
        variant: "destructive",
      })
      
      // Navigate to the tab with the error
      if (errors.name) {
        setActiveTab("general")
      } else if (errors.inputs) {
        setActiveTab("inputs")
      } else if (errors.outputs) {
        setActiveTab("outputs")
      } else if (errors.logic) {
        setActiveTab("logic")
      }
      
      return
    }

    // Create the block definition
    const blockDefinition: CustomBlockDefinition = {
      id: initialBlock?.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      inputs,
      outputs,
      logicType,
      logic,
      isPublic,
      createdAt: initialBlock?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: initialBlock?.createdBy,
      version: initialBlock?.version,
      tags,
    }

    // Save the block
    onSave(blockDefinition)
    onOpenChange(false)
  }

  // Define the form content to be used in both inline and dialog modes
  const formContent = (
    <>
      {!inline && (
        <DialogHeader>
          <DialogTitle>{initialBlock ? "Edit Custom Block" : "Create Custom Block"}</DialogTitle>
        </DialogHeader>
      )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
            <TabsTrigger value="logic">Logic</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="general" className="h-full">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 p-1">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter block name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter block description"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={(value) => setCategory(value as NodeCategory)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NodeCategory.TRIGGER}>Trigger</SelectItem>
                        <SelectItem value={NodeCategory.ACTION}>Action</SelectItem>
                        <SelectItem value={NodeCategory.LOGIC}>Logic</SelectItem>
                        <SelectItem value={NodeCategory.FINANCE}>Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tags"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add a tag"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addTag()
                          }
                        }}
                      />
                      <Button type="button" onClick={addTag} size="sm">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
                    <Label htmlFor="public">Make this block public</Label>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="inputs" className="h-full">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 p-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Input Parameters</h3>
                    <Button onClick={addInput} size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Input
                    </Button>
                  </div>

                  {inputs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No input parameters defined</p>
                      <p className="text-xs mt-1">Click 'Add Input' to define parameters for your block</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {inputs.map((input, index) => (
                        <Card key={input.id}>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-medium flex justify-between">
                              <span>Input Parameter {index + 1}</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveInputUp(index)}
                                  disabled={index === 0}
                                >
                                  <MoveUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveInputDown(index)}
                                  disabled={index === inputs.length - 1}
                                >
                                  <MoveDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeInput(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-2 px-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`input-name-${index}`}>Name</Label>
                                <Input
                                  id={`input-name-${index}`}
                                  value={input.name}
                                  onChange={(e) => updateInput(index, { name: e.target.value })}
                                  placeholder="Parameter name"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`input-type-${index}`}>Data Type</Label>
                                <Select
                                  value={input.dataType}
                                  onValueChange={(value) => updateInput(index, { dataType: value as DataType })}
                                >
                                  <SelectTrigger id={`input-type-${index}`}>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={DataType.STRING}>String</SelectItem>
                                    <SelectItem value={DataType.NUMBER}>Number</SelectItem>
                                    <SelectItem value={DataType.BOOLEAN}>Boolean</SelectItem>
                                    <SelectItem value={DataType.OBJECT}>Object</SelectItem>
                                    <SelectItem value={DataType.ARRAY}>Array</SelectItem>
                                    <SelectItem value={DataType.ANY}>Any</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`input-desc-${index}`}>Description</Label>
                              <Textarea
                                id={`input-desc-${index}`}
                                value={input.description}
                                onChange={(e) => updateInput(index, { description: e.target.value })}
                                placeholder="Parameter description"
                                rows={2}
                              />
                            </div>
                            <div className="flex items-center space-x-2 pt-1">
                              <Switch
                                id={`input-required-${index}`}
                                checked={input.required}
                                onCheckedChange={(checked) => updateInput(index, { required: checked })}
                              />
                              <Label htmlFor={`input-required-${index}`}>Required</Label>
                            </div>
                            {!input.required && (
                              <div className="space-y-1">
                                <Label htmlFor={`input-default-${index}`}>Default Value</Label>
                                <Input
                                  id={`input-default-${index}`}
                                  value={input.defaultValue || ""}
                                  onChange={(e) => updateInput(index, { defaultValue: e.target.value })}
                                  placeholder="Default value"
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="outputs" className="h-full">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 p-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Output Parameters</h3>
                    <Button onClick={addOutput} size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Output
                    </Button>
                  </div>

                  {outputs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No output parameters defined</p>
                      <p className="text-xs mt-1">Click 'Add Output' to define what your block will return</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {outputs.map((output, index) => (
                        <Card key={output.id}>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-medium flex justify-between">
                              <span>Output Parameter {index + 1}</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveOutputUp(index)}
                                  disabled={index === 0}
                                >
                                  <MoveUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveOutputDown(index)}
                                  disabled={index === outputs.length - 1}
                                >
                                  <MoveDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeOutput(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-2 px-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`output-name-${index}`}>Name</Label>
                                <Input
                                  id={`output-name-${index}`}
                                  value={output.name}
                                  onChange={(e) => updateOutput(index, { name: e.target.value })}
                                  placeholder="Parameter name"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`output-type-${index}`}>Data Type</Label>
                                <Select
                                  value={output.dataType}
                                  onValueChange={(value) => updateOutput(index, { dataType: value as DataType })}
                                >
                                  <SelectTrigger id={`output-type-${index}`}>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={DataType.STRING}>String</SelectItem>
                                    <SelectItem value={DataType.NUMBER}>Number</SelectItem>
                                    <SelectItem value={DataType.BOOLEAN}>Boolean</SelectItem>
                                    <SelectItem value={DataType.OBJECT}>Object</SelectItem>
                                    <SelectItem value={DataType.ARRAY}>Array</SelectItem>
                                    <SelectItem value={DataType.ANY}>Any</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`output-desc-${index}`}>Description</Label>
                              <Textarea
                                id={`output-desc-${index}`}
                                value={output.description}
                                onChange={(e) => updateOutput(index, { description: e.target.value })}
                                placeholder="Parameter description"
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="logic" className="h-full">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 p-1">
                  <div className="space-y-2">
                    <Label htmlFor="logic-type">Logic Type</Label>
                    <Select value={logicType} onValueChange={(value) => setLogicType(value as LogicType)}>
                      <SelectTrigger id="logic-type">
                        <SelectValue placeholder="Select logic type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LogicType.JAVASCRIPT}>JavaScript</SelectItem>
                        <SelectItem value={LogicType.JSON_TRANSFORM}>JSON Transform</SelectItem>
                        <SelectItem value={LogicType.TEMPLATE}>String Template</SelectItem>
                        <SelectItem value={LogicType.CONDITION}>Condition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="logic">Block Logic</Label>
                      <div className="text-xs text-muted-foreground">
                        {logicType === LogicType.JAVASCRIPT && "function process(inputs) { ... }"}
                        {logicType === LogicType.JSON_TRANSFORM && '{ "output": "{{inputs.value}}" }'}
                        {logicType === LogicType.TEMPLATE && "Template with {{variables}}"}
                        {logicType === LogicType.CONDITION && "inputs.value > 10"}
                      </div>
                    </div>
                    
                    {validationErrors.logic && (
                      <Alert variant="destructive" className="py-2 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs ml-2">{validationErrors.logic}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="border rounded-md overflow-hidden">
                      <CodeMirror
                        value={logic}
                        height="350px"
                        theme={vscodeDark}
                        extensions={[
                          EditorView.lineWrapping,
                          logicType === LogicType.JAVASCRIPT ? javascript() : 
                          logicType === LogicType.JSON_TRANSFORM ? json() : 
                          EditorView.lineWrapping
                        ]}
                        onChange={(value) => setLogic(value)}
                        placeholder={
                          logicType === LogicType.JAVASCRIPT
                            ? "function process(inputs) {\n  // Your code here\n  return { output: inputs.value };\n}"
                            : logicType === LogicType.JSON_TRANSFORM
                              ? '{\n  "output": "{{inputs.value}}" }'
                              : logicType === LogicType.TEMPLATE
                                ? "Hello {{inputs.name}},\n\nThis is a template."
                                : "inputs.value > 10"
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-muted p-3 rounded-md">
                      <h4 className="text-sm font-medium mb-2">Logic Type Help</h4>
                      <p className="text-xs text-muted-foreground">
                        {logicType === LogicType.JAVASCRIPT && (
                          <>
                            Write a JavaScript function that processes inputs and returns outputs. The function should
                            accept an <code>inputs</code> object and return an object with output values.
                          </>
                        )}
                        {logicType === LogicType.JSON_TRANSFORM && (
                          <>
                            Define a JSON template with variables in double curly braces. For example:{" "}
                            <code>{"{{inputs.value}}"}</code> will be replaced with the actual input value.
                          </>
                        )}
                        {logicType === LogicType.TEMPLATE && (
                          <>
                            Create a text template with variables in double curly braces. For example:{" "}
                            <code>{`Hello {{inputs.name}}`}</code> will be replaced with the actual name.
                          </>
                        )}
                        {logicType === LogicType.CONDITION && (
                          <>
                            Write a condition expression that evaluates to true or false. Use <code>inputs.value</code> to
                            reference input values. For example: <code>inputs.value &gt; 10</code>.
                          </>
                        )}
                      </p>
                    </div>
                    
                    {onGenerateWithAI && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm font-medium flex items-center">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate with AI
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Let AI generate logic based on your inputs and outputs.
                            </p>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Describe what your block should do..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                disabled={isGenerating}
                              />
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  if (!aiPrompt.trim()) return;
                                  setIsGenerating(true);
                                  
                                  onGenerateWithAI?.(aiPrompt, (generatedBlock) => {
                                    if (generatedBlock.logic) {
                                      setLogic(generatedBlock.logic);
                                      
                                      // If logic type is provided, update it
                                      if (generatedBlock.logicType) {
                                        setLogicType(generatedBlock.logicType);
                                      }
                                      
                                      toast({
                                        title: "Logic Generated",
                                        description: "AI has generated logic for your block.",
                                      });
                                    }
                                    setIsGenerating(false);
                                  });
                                }}
                                disabled={!aiPrompt.trim() || isGenerating || !onGenerateWithAI}
                              >
                                {isGenerating ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>Generate</>  
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        {!inline && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{initialBlock ? "Update" : "Create"}</Button>
          </DialogFooter>
        )}
        
        {inline && (
          <div className="flex justify-end p-4 border-t">
            <Button onClick={handleSave} className="w-full">
              {initialBlock ? "Update" : "Create"} Block
            </Button>
          </div>
        )}
    </>
  );
  
  // Render the content in a Dialog for normal mode, or directly for inline mode
  return inline ? (
    <div className="custom-block-builder-inline">
      <div className="max-h-[90vh] flex flex-col">
        {formContent}
      </div>
    </div>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
