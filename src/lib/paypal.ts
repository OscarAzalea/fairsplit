import { PayoutItem, PayoutStatus } from './types';
import { centsToDollars } from './fairsplit-math';

export interface PayPalOrderResponse {
  id: string;
  mode: 'sandbox' | 'simulated';
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: 'CAPTURE';
  purchase_units: {
    reference_id: string;
    amount: {
      currency_code: string;
      value: string;
    };
    description: string;
  }[];
  create_time: string;
  links?: {
    href: string;
    rel: string;
    method: string;
  }[];
}

export interface PayPalCaptureResponse {
  id: string;
  mode: 'sandbox' | 'simulated';
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  purchase_units: {
    payments: {
      captures: {
        id: string;
        status: 'COMPLETED';
        amount: {
          currency_code: string;
          value: string;
        };
        seller_receivable_breakdown?: {
          gross_amount: { value: string; currency_code: string };
          paypal_fee: { value: string; currency_code: string };
          net_amount: { value: string; currency_code: string };
        };
      }[];
    };
  }[];
}

/**
 * Reports whether the server can make real PayPal Sandbox API calls.
 * The client ID is public by design and is only returned for SDK setup.
 */
export function getPayPalIntegrationStatus(): {
  mode: 'sandbox' | 'simulated' | 'incomplete';
  clientId?: string;
} {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const hasAnyCredential = Boolean(clientId || clientSecret);

  if (!hasAnyCredential) {
    return { mode: 'simulated' };
  }

  if (!clientId || !clientSecret) {
    return { mode: 'incomplete' };
  }

  return { mode: 'sandbox', clientId };
}

async function getPayPalAccessToken(): Promise<string> {
  const { mode } = getPayPalIntegrationStatus();
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (mode !== 'sandbox' || !clientId || !clientSecret) {
    throw new Error('PayPal Sandbox credentials are incomplete.');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!tokenRes.ok) {
    throw new Error(`PayPal Sandbox authentication failed (${tokenRes.status}).`);
  }

  const tokenData = await tokenRes.json();
  if (typeof tokenData.access_token !== 'string') {
    throw new Error('PayPal Sandbox did not return an access token.');
  }

  return tokenData.access_token;
}

/**
 * Creates a real PayPal Sandbox order when credentials are present.
 * Without credentials, returns a clearly labelled simulator order.
 */
export async function createSandboxOrder(
  amountDollars: number,
  description: string
): Promise<PayPalOrderResponse> {
  const integration = getPayPalIntegrationStatus();

  if (integration.mode === 'incomplete') {
    throw new Error('Configure both PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
  }

  if (integration.mode === 'sandbox') {
    const accessToken = await getPayPalAccessToken();
    const orderRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amountDollars.toFixed(2),
            },
            description,
          },
        ],
      }),
      cache: 'no-store',
    });

    if (!orderRes.ok) {
      throw new Error(`PayPal Sandbox order creation failed (${orderRes.status}).`);
    }

    return { ...(await orderRes.json()), mode: 'sandbox' };
  }

  // Standalone simulator. It does not create an order at PayPal.
  const orderId = `ORD-SANDBOX-${Math.floor(100000 + Math.random() * 900000)}`;
  return {
    id: orderId,
    mode: 'simulated',
    status: 'CREATED',
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: 'default',
        amount: {
          currency_code: 'USD',
          value: amountDollars.toFixed(2),
        },
        description,
      },
    ],
    create_time: new Date().toISOString(),
    links: [
      {
        href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
        rel: 'approve',
        method: 'GET',
      },
      {
        href: `/api/paypal/capture-order?orderId=${orderId}`,
        rel: 'capture',
        method: 'POST',
      },
    ],
  };
}

/**
 * Captures a buyer-approved PayPal Sandbox order. A simulator amount is
 * accepted only for locally generated simulator IDs.
 */
export async function captureSandboxOrder(
  orderId: string,
  simulatedAmountDollars?: number
): Promise<PayPalCaptureResponse> {
  const integration = getPayPalIntegrationStatus();

  if (integration.mode === 'incomplete') {
    throw new Error('Configure both PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
  }

  if (integration.mode === 'sandbox') {
    const accessToken = await getPayPalAccessToken();
    const captureRes = await fetch(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
        cache: 'no-store',
      }
    );

    if (!captureRes.ok) {
      throw new Error(`PayPal Sandbox capture failed (${captureRes.status}).`);
    }

    return { ...(await captureRes.json()), mode: 'sandbox' };
  }

  if (!/^ORD-SANDBOX-\d{6}$/.test(orderId)) {
    throw new Error('Simulator can only capture its own generated order IDs.');
  }
  if (
    typeof simulatedAmountDollars !== 'number' ||
    !Number.isFinite(simulatedAmountDollars) ||
    simulatedAmountDollars <= 0
  ) {
    throw new Error('A valid amount is required to simulate a capture.');
  }

  const amountDollars = simulatedAmountDollars;
  const grossValue = amountDollars.toFixed(2);
  const feeValue = (amountDollars * 0.0299 + 0.49).toFixed(2);
  const netValue = (amountDollars - parseFloat(feeValue)).toFixed(2);

  return {
    id: orderId,
    mode: 'simulated',
    status: 'COMPLETED',
    purchase_units: [
      {
        payments: {
          captures: [
            {
              id: `CAP-${Math.floor(100000 + Math.random() * 900000)}`,
              status: 'COMPLETED',
              amount: {
                currency_code: 'USD',
                value: grossValue,
              },
              seller_receivable_breakdown: {
                gross_amount: { value: grossValue, currency_code: 'USD' },
                paypal_fee: { value: feeValue, currency_code: 'USD' },
                net_amount: { value: netValue, currency_code: 'USD' },
              },
            },
          ],
        },
      },
    ],
  };
}

/**
 * Constructs and executes a PayPal Payouts API batch payload.
 * Conforms strictly to PayPal Payouts API schema with idempotent keys.
 */
export function buildPayPalPayoutPayload(
  senderBatchId: string,
  items: PayoutItem[]
): Record<string, unknown> {
  return {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      email_subject: 'Your Project Aurora Rev-Share Payout is Here!',
      email_message:
        'FairSplit has verified and distributed your earnings under the active Trust Ledger epoch.',
      recipient_type: 'EMAIL',
    },
    items: items.map((item) => ({
      recipient_type: 'EMAIL',
      amount: {
        value: (item.amountCents / 100).toFixed(2),
        currency: 'USD',
      },
      receiver: item.receiverEmail,
      note: item.note || 'FairSplit verified distribution',
      sender_item_id: item.senderItemId,
    })),
  };
}

/**
 * Simulates executing PayPal Payouts API batch with realistic latency
 * and per-item status validation.
 */
export async function executePayPalPayoutBatch(
  senderBatchId: string,
  items: PayoutItem[]
): Promise<{
  payoutBatchId: string;
  status: PayoutStatus;
  items: PayoutItem[];
  rawPayload: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
}> {
  const payload = buildPayPalPayoutPayload(senderBatchId, items);
  const payoutBatchId = `PAYPAL-BATCH-${Math.floor(10000000 + Math.random() * 90000000)}`;

  // Simulate network delay of PayPal Payouts engine
  await new Promise((resolve) => setTimeout(resolve, 600));

  const updatedItems = items.map((item) => {
    // Every item with valid receiver succeeds; simulate robustness
    const isSuccess = Boolean(item.receiverEmail && item.amountCents > 0);
    return {
      ...item,
      payoutItemId: `P-ITEM-${Math.floor(10000 + Math.random() * 90000)}`,
      status: (isSuccess ? 'SUCCESS' : 'FAILED') as PayoutStatus,
      processedAt: new Date().toISOString(),
      error: isSuccess ? undefined : 'Invalid receiver or zero amount',
    };
  });

  const allSuccess = updatedItems.every((i) => i.status === 'SUCCESS');

  const rawResponse = {
    batch_header: {
      payout_batch_id: payoutBatchId,
      batch_status: allSuccess ? 'SUCCESS' : 'DENIED',
      time_created: new Date().toISOString(),
      sender_batch_header: payload.sender_batch_header,
    },
    links: [
      {
        href: `https://api-m.sandbox.paypal.com/v1/payments/payouts/${payoutBatchId}`,
        rel: 'self',
        method: 'GET',
      },
    ],
  };

  return {
    payoutBatchId,
    status: (allSuccess ? 'SUCCESS' : 'FAILED') as PayoutStatus,
    items: updatedItems,
    rawPayload: payload,
    rawResponse,
  };
}
