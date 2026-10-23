import { NextRequest, NextResponse } from 'next/server';
import { captureSandboxOrder } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, amountDollars } = body;

    if (!orderId || !amountDollars) {
      return NextResponse.json(
        { error: 'Missing orderId or amountDollars' },
        { status: 400 }
      );
    }

    const captureResult = await captureSandboxOrder(orderId, Number(amountDollars));

    return NextResponse.json(captureResult);
  } catch (error: unknown) {
    console.error('Error in /api/paypal/capture-order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
