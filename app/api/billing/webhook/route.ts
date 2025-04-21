import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export const config = {
  api: { bodyParser: false }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-03-31.basil',
})

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  const buf = Buffer.from(await request.text(), 'utf8')
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // Cast to any to access period end property
        const subscription: any = event.data.object
        const userId = subscription.metadata?.userId as string
        const tier = subscription.items?.data[0]?.price?.nickname || subscription.items?.data[0]?.price?.id
        const status = subscription.status
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString()
        await supabase.from('profiles').update({
          subscription_tier: tier,
          subscription_status: status,
          subscription_expires_at: expiresAt
        }).eq('id', userId)
        break
      }
      default:
        // ignore other events
        break
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler failed.', err)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }
}
