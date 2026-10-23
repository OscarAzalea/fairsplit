import { NextRequest, NextResponse } from 'next/server';
import { runStudioAdvisor } from '@/lib/gemini';
import { Epoch } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userQuery, topic, activeEpoch, pendingCents, inflowsCount } = body;

    if (!userQuery || !topic || !activeEpoch) {
      return NextResponse.json(
        { error: 'Missing required fields: userQuery, topic, activeEpoch' },
        { status: 400 }
      );
    }

    const advice = await runStudioAdvisor(
      userQuery,
      topic,
      activeEpoch as Epoch,
      Number(pendingCents) || 0,
      Number(inflowsCount) || 0
    );

    return NextResponse.json(advice);
  } catch (error: unknown) {
    console.error('Error in /api/advisor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
