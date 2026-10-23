import { NextRequest, NextResponse } from 'next/server';
import { runSocraticNegotiation } from '@/lib/gemini';
import { MEMBERS } from '@/lib/initial-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentSplits, proposedSplits, proposerRole, rationale, contextNotes } = body;

    if (!currentSplits || !proposedSplits || !proposerRole) {
      return NextResponse.json(
        { error: 'Missing required fields: currentSplits, proposedSplits, proposerRole' },
        { status: 400 }
      );
    }

    const result = await runSocraticNegotiation(
      { currentSplits, proposedSplits, proposerRole, rationale, contextNotes },
      MEMBERS
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in /api/negotiate:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
