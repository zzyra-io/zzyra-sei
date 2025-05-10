import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OpenRouterProvider } from "@/lib/ai-providers/openrouter";
import { getPromptBuilderForCategory, BlockPromptData } from "@/lib/ai/prompt-builder";

// Force Node runtime for AI processing
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Initialize Supabase client
  const supabase = await createClient();
  
  // Get user from session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { 
      blockName, 
      blockDescription, 
      blockInputs, 
      blockOutputs, 
      blockCategory 
    } = await request.json();

    // Basic validation
    if (!blockName || !blockDescription) {
      return NextResponse.json(
        { error: "Missing required fields: name and description" },
        { status: 400 }
      );
    }

    console.log(`[API] Generating block: ${blockName} (${blockCategory})`)
    
    try {
      // Input sanitization and validation - prevent potential prompt injection
      const sanitizedName = blockName?.trim().slice(0, 100) || "";
      const sanitizedDescription = blockDescription?.trim().slice(0, 500) || "";
      const sanitizedInputs = blockInputs?.trim().slice(0, 1000) || "";
      const sanitizedOutputs = blockOutputs?.trim().slice(0, 1000) || "";
      const sanitizedCategory = blockCategory?.trim().toUpperCase() || "ACTION";
      
      // Additional validation
      if (sanitizedName.length < 3) {
        return NextResponse.json(
          { error: "Block name must be at least 3 characters long" },
          { status: 400 }
        );
      }
      
      if (sanitizedDescription.length < 10) {
        return NextResponse.json(
          { error: "Block description must be at least 10 characters long" },
          { status: 400 }
        );
      }
      
      // Create the block prompt data structure
      const blockPromptData: BlockPromptData = {
        blockName: sanitizedName,
        blockDescription: sanitizedDescription,
        blockInputs: sanitizedInputs,
        blockOutputs: sanitizedOutputs,
        blockCategory: sanitizedCategory
      };
      
      // Get the appropriate prompt builder based on the block category 
      // with fallback to default builder if category isn't recognized
      const promptBuilder = getPromptBuilderForCategory(sanitizedCategory);
      
      // Build the specialized prompt
      const prompt = promptBuilder(blockPromptData);
      
      // Initialize OpenRouter provider
      const aiProvider = new OpenRouterProvider();
      
      // Set timeout for AI request to prevent hanging requests
      const timeoutMs = 30000; // 30 seconds timeout
      
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI generation request timed out')), timeoutMs);
      });
      
      // Race the AI request against the timeout - properly typed
      // The timeoutPromise is never fulfilled, only rejected, so the successful result must be from the AI provider
      const generatedBlockData = await Promise.race([
        aiProvider.generateCustomBlock(prompt, user.id),
        timeoutPromise
      ]);
      
      console.log("[API] AI block generation successful");
      
      // Track the generation for analytics in a server-side friendly way
      // Note: Server-side analytics would require a different approach,
      // For a production setup we should implement a proper server-side analytics solution
      try {
        // Log analytics for now, in production implement server-side tracking
        console.log('[API] Analytics event: ai_block_generated', {
          blockName: sanitizedName, 
          blockCategory: sanitizedCategory,
          userId: user.id,
          generationSuccess: true,
          timestamp: new Date().toISOString()
        });
        
        // In production, replace with proper server-side analytics
        // Example: posthogServerClient.capture(...)
      } catch (analyticsError) {
        console.warn('[API] Analytics tracking error:', analyticsError);
      }

      // Return the AI-generated block data
      return NextResponse.json(generatedBlockData);
    } catch (error) {
      // Detailed error logging with context
      console.error("[API] Error generating block:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        blockName,
        blockCategory,
        userId: user.id
      });
      
      // Track the failure for analytics in a server-side friendly way
      try {
        // Log analytics event for now - replace with proper server-side analytics in production
        console.log('[API] Analytics event: ai_block_generation_failed', {
          blockName,
          blockCategory,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          userId: user.id,
          timestamp: new Date().toISOString()
        });
        
        // In production, you would use a real analytics service here
        // Example: await posthogServerClient.capture(...)
      } catch (analyticsError) {
        console.warn('[API] Analytics tracking error:', analyticsError);
      }
      
      // Return a user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isTimeout = errorMessage.includes('timed out');
      
      return NextResponse.json(
        { 
          error: isTimeout ? 
            "AI generation request timed out. Please try again or use a simpler description." : 
            `Failed to generate block: ${errorMessage}` 
        },
        { status: isTimeout ? 504 : 500 }
      );
    }
  } catch (error) {
    console.error("[API] Error generating block:", error);
    return NextResponse.json(
      { error: `Failed to generate block: ${error instanceof Error ? error.message : "Unknown AI error"}` }, 
      { status: 500 }
    );
  }
}
