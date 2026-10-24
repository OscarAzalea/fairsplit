import { NextRequest, NextResponse } from 'next/server';
import { captureSandboxOrder } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, amountDollars } = body;

    if (typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json(
        { error: 'A valid orderId is required.' },
        { status: 400 }
      );
    }

    // The server ignores this value for real PayPal captures. It is used only
    // by the local simulator, which has no PayPal order record to query.
    const simulatedAmount =
      typeof amountDollars === 'number' ? amountDollars : Number(amountDollars);
    const captureResult = await captureSandboxOrder(orderId, simulatedAmount);

    return NextResponse.json(captureResult);
  } catch (error: unknown) {
    console.error('Error in /api/paypal/capture-order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
