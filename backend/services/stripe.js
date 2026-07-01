const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Creates a Stripe Checkout session for a template purchase.
 */
async function createCheckoutSession({ userEmail, templateName, templatePriceCents, projectId, successUrl, cancelUrl }) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: templateName },
          unit_amount: templatePriceCents,
        },
        quantity: 1,
      },
    ],
    metadata: { projectId },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

function constructWebhookEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

async function refundPayment(paymentIntentId, reason) {
  return stripe.refunds.create({ payment_intent: paymentIntentId, reason: reason || 'requested_by_customer' });
}

module.exports = { stripe, createCheckoutSession, constructWebhookEvent, refundPayment };
