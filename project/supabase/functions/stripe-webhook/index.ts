import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error("Stripe keys not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing event: ${event.type}`);

    const { data: existingEvent } = await supabase
      .from("subscription_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response(
        JSON.stringify({ received: true, message: "Event already processed" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, stripe, session, event.id);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, subscription, event.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription, event.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabase, invoice, event.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice, event.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing webhook:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Webhook processing failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleCheckoutCompleted(
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const userId = session.metadata?.supabase_user_id;

  if (!userId) {
    console.error("No user ID in session metadata");
    return;
  }

  if (session.mode === "subscription" && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    await upsertSubscription(supabase, subscription, userId, eventId);
  }

  await supabase.from("subscription_events").insert({
    user_id: userId,
    stripe_event_id: eventId,
    event_type: "checkout.session.completed",
    stripe_subscription_id: session.subscription as string,
    event_data: session,
    processed: true,
  });
}

async function handleSubscriptionChange(
  supabase: any,
  subscription: Stripe.Subscription,
  eventId: string
) {
  const userId = subscription.metadata?.supabase_user_id;

  if (!userId) {
    const { data: customer } = await supabase
      .from("stripe_customers")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer)
      .maybeSingle();

    if (!customer) {
      console.error("No user found for customer:", subscription.customer);
      return;
    }

    await upsertSubscription(supabase, subscription, customer.user_id, eventId);
  } else {
    await upsertSubscription(supabase, subscription, userId, eventId);
  }
}

async function upsertSubscription(
  supabase: any,
  subscription: Stripe.Subscription,
  userId: string,
  eventId: string
) {
  const priceId = subscription.items.data[0]?.price.id;
  const interval = subscription.items.data[0]?.price.recurring?.interval || "month";

  const tier = "premium";

  const subscriptionData = {
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    stripe_price_id: priceId,
    status: subscription.status,
    tier: tier,
    interval: interval,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    metadata: subscription.metadata || {},
  };

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("subscriptions")
      .update(subscriptionData)
      .eq("stripe_subscription_id", subscription.id);
  } else {
    await supabase.from("subscriptions").insert(subscriptionData);
  }

  await supabase.from("subscription_events").insert({
    user_id: userId,
    stripe_event_id: eventId,
    event_type: "subscription.updated",
    stripe_subscription_id: subscription.id,
    event_data: subscription,
    processed: true,
  });

  console.log(`Subscription ${subscription.id} upserted for user ${userId}`);
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription,
  eventId: string
) {
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id, id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    await supabase.from("subscription_events").insert({
      user_id: existing.user_id,
      stripe_event_id: eventId,
      event_type: "subscription.deleted",
      subscription_id: existing.id,
      stripe_subscription_id: subscription.id,
      event_data: subscription,
      processed: true,
    });

    console.log(`Subscription ${subscription.id} marked as canceled`);
  }
}

async function handlePaymentSucceeded(
  supabase: any,
  invoice: Stripe.Invoice,
  eventId: string
) {
  const { data: customer } = await supabase
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", invoice.customer)
    .maybeSingle();

  if (customer) {
    await supabase.from("subscription_events").insert({
      user_id: customer.user_id,
      stripe_event_id: eventId,
      event_type: "payment.succeeded",
      stripe_subscription_id: invoice.subscription as string,
      event_data: invoice,
      processed: true,
    });

    console.log(`Payment succeeded for customer ${invoice.customer}`);
  }
}

async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice,
  eventId: string
) {
  const { data: customer } = await supabase
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", invoice.customer)
    .maybeSingle();

  if (customer) {
    await supabase
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("stripe_customer_id", invoice.customer)
      .eq("status", "active");

    await supabase.from("subscription_events").insert({
      user_id: customer.user_id,
      stripe_event_id: eventId,
      event_type: "payment.failed",
      stripe_subscription_id: invoice.subscription as string,
      event_data: invoice,
      processed: true,
    });

    console.log(`Payment failed for customer ${invoice.customer}`);
  }
}
