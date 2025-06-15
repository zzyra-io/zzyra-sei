import { NextResponse } from "next/server";
// import Stripe from 'stripe'

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
//   apiVersion: '2025-03-31.basil',
// })

export async function POST(request: Request) {
  // Authenticate user
  // try {
  //   // Create Stripe Checkout Session
  //   const session = await stripe.checkout.sessions.create({
  //     mode: 'subscription',
  //     payment_method_types: ['card'],
  //     line_items: [
  //       { price: process.env.STRIPE_PRICE_ID!, quantity: 1 }
  //     ],
  //     customer_email: user.email,
  //     subscription_data: { metadata: { userId: user.id } },
  //     success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?session_id={CHECKOUT_SESSION_ID}`,
  //     cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`
  //   })
  //   return NextResponse.json({ url: session.url })
  // } catch (error: any) {
  //   console.error('Stripe checkout error:', error)
  //   return NextResponse.json({ error: error.message }, { status: 500 })
  // }
}
