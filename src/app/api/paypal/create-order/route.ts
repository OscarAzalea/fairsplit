import { NextRequest, NextResponse } from 'next/server';
import { createSandboxOrder } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountDollars, description } = body;

    if (!amountDollars || amountDollars <= 0) {
      return NextResponse.json(
        { error: 'Valid positive amountDollars is required' },
        { status: 400 }
      );
    }

    const order = await createSandboxOrder(
      Number(amountDollars),
      description || 'FairSplit Project Aurora Inflow'
    );

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error('Error in /api/paypal/create-order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
