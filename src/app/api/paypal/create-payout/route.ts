import { NextRequest, NextResponse } from 'next/server';
import { simulatePayPalPayoutBatch } from '@/lib/paypal';
import { PayoutItem } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderBatchId, items } = body;

    const validItems = Array.isArray(items) && items.length > 0 && items.length <= 100 &&
      items.every((item: unknown) => {
        if (!item || typeof item !== 'object') return false;
        const payoutItem = item as Partial<PayoutItem>;
        return typeof payoutItem.senderItemId === 'string' && payoutItem.senderItemId.length > 0 && payoutItem.senderItemId.length <= 127 &&
          ['dev', 'artist', 'writer', 'composer'].includes(payoutItem.memberId ?? '') &&
          typeof payoutItem.memberName === 'string' && payoutItem.memberName.length > 0 &&
          typeof payoutItem.receiverEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payoutItem.receiverEmail) &&
          Number.isSafeInteger(payoutItem.amountCents) && (payoutItem.amountCents ?? 0) > 0 &&
          payoutItem.currency === 'USD';
      });
    const itemIds = Array.isArray(items) ? items.map((item: PayoutItem) => item.senderItemId) : [];

    if (typeof senderBatchId !== 'string' || senderBatchId.length === 0 || senderBatchId.length > 127 ||
      !validItems || new Set(itemIds).size !== itemIds.length) {
      return NextResponse.json(
        { error: 'A valid demo batch ID and unique USD payout items are required.' },
        { status: 400 }
      );
    }

    const result = await simulatePayPalPayoutBatch(senderBatchId, items as PayoutItem[]);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in /api/paypal/create-payout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
