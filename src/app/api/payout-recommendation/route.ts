import { NextRequest, NextResponse } from 'next/server';
import { runPayoutSchedulerAdvice } from '@/lib/gemini';
import { Epoch } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requesterName, isAnonymous, reasonOrNeed, pendingCents, activeEpoch } = body;

    const rec = await runPayoutSchedulerAdvice(
      requesterName || 'Elena Vance (Artist)',
      Boolean(isAnonymous),
      reasonOrNeed || 'Upcoming milestone & personal liquidity review',
      Number(pendingCents) || 0,
      activeEpoch as Epoch
    );

    return NextResponse.json(rec);
  } catch (error: unknown) {
    console.error('Error in /api/payout-recommendation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
