import { NextRequest, NextResponse } from 'next/server';
import { executePayPalPayoutBatch } from '@/lib/paypal';
import { PayoutItem } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderBatchId, items } = body;

    if (!senderBatchId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing senderBatchId or non-empty items array' },
        { status: 400 }
      );
    }

    const result = await executePayPalPayoutBatch(senderBatchId, items as PayoutItem[]);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in /api/paypal/create-payout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
