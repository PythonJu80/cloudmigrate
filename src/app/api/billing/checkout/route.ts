import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

// Stripe Price IDs - set these in your Stripe dashboard
const PRICE_IDS: Record<string, string> = {
  PRO: process.env.STRIPE_PRO_PRICE_ID || "price_pro_monthly",
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise_monthly",
};

/**
 * POST /api/billing/checkout - Create Stripe checkout session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();
    
    if (!planId) {
      return NextResponse.json({ error: "No plan specified" }, { status: 400 });
    }

    // FREE plan doesn't need checkout
    if (planId === "FREE") {
      return NextResponse.json({ error: "Cannot checkout for free plan" }, { status: 400 });
    }

    const priceId = PRICE_IDS[planId];
    if (!priceId || priceId === "price_pro_monthly" || priceId === "price_enterprise_monthly") {
      return NextResponse.json({ 
        error: `Price ID not configured for ${planId}. Set STRIPE_${planId}_PRICE_ID in .env` 
      }, { status: 400 });
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ 
        error: "Stripe is not configured. Add STRIPE_SECRET_KEY to your .env file." 
      }, { status: 503 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Create or get Stripe customer
    let customerId = tenant.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: tenant.name,
        metadata: {
          tenantId: tenant.id,
        },
      });
      
      customerId = customer.id;
      
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true&plan=${planId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/billing?canceled=true`,
      metadata: {
        tenantId: tenant.id,
        planId,
      },
      subscription_data: {
        metadata: {
          tenantId: tenant.id,
          planId,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json({ 
      error: error?.message || "Failed to create checkout session" 
    }, { status: 500 });
  }
}
