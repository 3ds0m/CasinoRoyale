import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import * as corsLib from "cors";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Initialize Stripe (use mock key if env is not set)
const stripeSecret = process.env.STRIPE_SECRET_KEY || "sk_test_mock_secret_key_12345";
const stripe = new Stripe(stripeSecret, {
  apiVersion: "2023-10-16" as any,
});

const cors = corsLib({ origin: true });

/**
 * Cloud Function to create a Stripe Checkout Session
 */
export const createStripeCheckout = onRequest({ cors: true }, async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const { userId, packageId, coinAmount, price } = req.body;

      if (!userId || !packageId || !coinAmount || !price) {
        res.status(400).send("Missing required fields: userId, packageId, coinAmount, price");
        return;
      }

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${coinAmount.toLocaleString()} Fichas Royale`,
                description: `Paquete de fichas para jugar en Casino Royale: ${packageId}`,
              },
              unit_amount: price, // in cents (e.g., 500 for $5.00)
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `http://localhost:5173/?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:5173/?status=cancel`,
        metadata: {
          userId,
          packageId,
          coinAmount: coinAmount.toString(),
        },
      });

      res.status(200).json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating Stripe session:", error);
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Cloud Function to handle Stripe Webhook events securely
 */
export const stripeWebhook = onRequest(async (req, res) => {
  const signature = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_secret_key_12345";

  let event: Stripe.Event;

  try {
    // Standard signature verification (skip verification in local emulator mode if signing keys are mock)
    const rawBody = (req as any).rawBody;
    
    if (webhookSecret.startsWith("whsec_mock")) {
      // Mock event verification for local emulator testing/development
      event = req.body;
    } else {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed:`, err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (!metadata || !metadata.userId || !metadata.coinAmount) {
      console.error("Missing metadata in checkout session completion:", session.id);
      res.status(400).send("Webhook processed with missing session metadata");
      return;
    }

    const { userId, coinAmount } = metadata;
    const coins = parseInt(coinAmount, 10);
    const sessionId = session.id;

    try {
      const txRef = db.collection("transactions").doc(sessionId);
      
      // Perform atomic update inside a Firestore transaction
      await db.runTransaction(async (transaction) => {
        const txDoc = await transaction.get(txRef);
        
        // Prevent duplicate processing
        if (txDoc.exists) {
          console.log(`Transaction ${sessionId} already processed.`);
          return;
        }

        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error(`User with uid ${userId} not found in database.`);
        }

        // 1. Log transaction
        transaction.set(txRef, {
          txId: sessionId,
          userId,
          amount: session.amount_total || 0,
          coinsEarned: coins,
          currency: session.currency || "usd",
          status: "completed",
          timestamp: new Date().toISOString(),
        });

        // 2. Atomically increment user's balance
        transaction.update(userRef, {
          balance: admin.firestore.FieldValue.increment(coins),
        });

        console.log(`Successfully credited ${coins} coins to user ${userId} for transaction ${sessionId}`);
      });

      res.status(200).json({ received: true, processed: true });
      return;
    } catch (error: any) {
      console.error("Failed to update user balance in transaction:", error);
      res.status(500).send(`Database transaction error: ${error.message}`);
      return;
    }
  }

  res.status(200).json({ received: true });
});
