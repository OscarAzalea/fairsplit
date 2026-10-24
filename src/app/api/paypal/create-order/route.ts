import { NextRequest, NextResponse } from 'next/server';
import { createSandboxOrder } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountDollars, description } = body;
    const amount = Number(amountDollars);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001
    ) {
      return NextResponse.json(
        { error: 'A positive amount with at most two decimal places is required.' },
        { status: 400 }
      );
    }

    const orderDescription =
      typeof description === 'string' && description.trim()
        ? description.trim().slice(0, 127)
        : 'FairSplit Project Aurora Inflow';
    const order = await createSandboxOrder(amount, orderDescription);

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error('Error in /api/paypal/create-order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
