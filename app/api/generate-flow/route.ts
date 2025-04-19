import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateFlowWithAI } from "@/lib/ai"

export const runtime = "edge"

export async function POST(request: Request) {
  try {
    // Validate required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 })
    }

    // Create authenticated Supabase client
    const supabase = createClient()

    // Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const { prompt } = await request.json()
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 })
    }

    try {
      // Generate flow using AI
      const flowData = await generateFlowWithAI(prompt, session.user.id)
      return NextResponse.json(flowData)
    } catch (aiError) {
      console.error("AI generation error:", aiError)
      return NextResponse.json({ error: "AI generation failed", details: aiError.message }, { status: 500 })
    }
  } catch (error) {
    console.error("Error generating flow:", error)
    return NextResponse.json({ error: "Failed to generate flow", details: error.message }, { status: 500 })
  }
}
