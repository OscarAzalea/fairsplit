import { NextRequest, NextResponse } from 'next/server';
import { runStudioChat } from '@/lib/gemini';
import { Epoch, Member } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userMessage, chatHistory, currentMember, activeEpoch, pendingReserveCents, inflowsCount } = body;

    if (!userMessage || !currentMember || !activeEpoch) {
      return NextResponse.json(
        { error: 'Missing required fields: userMessage, currentMember, activeEpoch' },
        { status: 400 }
      );
    }

    const result = await runStudioChat(
      userMessage,
      chatHistory || [],
      currentMember as Member,
      activeEpoch as Epoch,
      Number(pendingReserveCents) || 0,
      Number(inflowsCount) || 0
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in /api/ai-chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
