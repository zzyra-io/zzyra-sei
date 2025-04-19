import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
})

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""

serve(async (req) => {
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 })
  }

  try {
    const body = await req.text()
    let event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object, supabase)
        break
      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(event.data.object, supabase)
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 })
  }
})

async function handleSubscriptionChange(subscription, supabase) {
  const userId = subscription.metadata.userId

  if (!userId) {
    console.error("No userId found in subscription metadata")
    return
  }

  // Map Stripe product to subscription tier
  const productId = subscription.items.data[0].price.product
  const { data: product } = await stripe.products.retrieve(productId)

  // Get tier from product metadata
  const tier = product.metadata.tier || "free"

  // Map subscription status
  let status
  switch (subscription.status) {
    case "active":
      status = "active"
      break
    case "past_due":
      status = "past_due"
      break
    case "canceled":
      status = "canceled"
      break
    case "trialing":
      status = "trialing"
      break
    default:
      status = "inactive"
  }

  // Update user's subscription in database
  await supabase
    .from("profiles")
    .update({
      subscription_tier: tier,
      subscription_status: status,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      monthly_execution_quota: tier === "free" ? 100 : tier === "pro" ? 1000 : 10000,
      stripe_subscription_id: subscription.id,
    })
    .eq("id", userId)
}

async function handleSubscriptionCanceled(subscription, supabase) {
  const userId = subscription.metadata.userId

  if (!userId) {
    console.error("No userId found in subscription metadata")
    return
  }

  // Update user's subscription in database
  await supabase
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscription_status: "canceled",
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      monthly_execution_quota: 100,
    })
    .eq("id", userId)
}
