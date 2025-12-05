import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Stripe from "stripe";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/billing/webhook - Handle Stripe webhooks
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe || !webhookSecret) {
      console.error("Stripe webhook not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const planId = session.metadata?.planId;

        if (tenantId && planId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan: planId,
              stripeSubId: session.subscription as string,
            },
          });

          // Update Neo4j config based on plan
          const planLimits = PLAN_LIMITS[planId as PlanId] || PLAN_LIMITS.FREE;
          const gdsEnabled = planLimits.gds;
          await prisma.tenantNeo4jConfig.upsert({
            where: { tenantId },
            create: {
              tenantId,
              database: `tenant_${tenantId.replace(/-/g, "_")}`,
              password: process.env.NEO4J_PASSWORD || "cloudmigrate2025",
              gdsEnabled,
              embeddingsEnabled: gdsEnabled,
              maxNodes: planLimits.nodes === -1 ? 10000000 : planLimits.nodes,
              maxRelationships: planLimits.maxRelationships,
            },
            update: {
              gdsEnabled,
              embeddingsEnabled: gdsEnabled,
              maxNodes: planLimits.nodes === -1 ? 10000000 : planLimits.nodes,
              maxRelationships: planLimits.maxRelationships,
            },
          });

          console.log(`Tenant ${tenantId} upgraded to ${planId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenantId;

        if (tenantId) {
          // Handle subscription changes (upgrade/downgrade)
          const status = subscription.status;
          
          if (status === "active") {
            // Subscription is active
            console.log(`Subscription active for tenant ${tenantId}`);
          } else if (status === "past_due" || status === "unpaid") {
            // Payment failed - could downgrade or notify
            console.log(`Payment issue for tenant ${tenantId}: ${status}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenantId;

        if (tenantId) {
          // Downgrade to free plan
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan: "FREE",
              stripeSubId: null,
            },
          });

          // Reset Neo4j limits to FREE plan
          const freeLimits = PLAN_LIMITS.FREE;
          await prisma.tenantNeo4jConfig.update({
            where: { tenantId },
            data: {
              gdsEnabled: freeLimits.gds,
              embeddingsEnabled: freeLimits.gds,
              maxNodes: freeLimits.nodes,
              maxRelationships: freeLimits.maxRelationships,
            },
          });

          console.log(`Tenant ${tenantId} downgraded to FREE`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment succeeded for invoice ${invoice.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment failed for invoice ${invoice.id}`);
        // Could send notification email here
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
