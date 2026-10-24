import { NextRequest, NextResponse } from 'next/server';
import { runSocraticNegotiation } from '@/lib/gemini';
import { MEMBERS } from '@/lib/initial-data';
import { MemberRole } from '@/lib/types';

function isValidSplitMap(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const splits = value as Record<string, unknown>;
  const memberIds = MEMBERS.map((member) => member.id);
  if (Object.keys(splits).length !== memberIds.length) return false;

  return (
    memberIds.every((id) => Number.isInteger(splits[id]) && Number(splits[id]) >= 0) &&
    memberIds.reduce((sum, id) => sum + Number(splits[id]), 0) === 10000
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentSplits, proposedSplits, proposerRole, rationale, contextNotes } = body;

    if (
      !isValidSplitMap(currentSplits) ||
      !isValidSplitMap(proposedSplits) ||
      typeof proposerRole !== 'string' ||
      !MEMBERS.some((member) => member.id === proposerRole)
    ) {
      return NextResponse.json(
        {
          error:
            'Current and proposed splits must contain each team member and sum to exactly 10,000 basis points.',
        },
        { status: 400 }
      );
    }

    const result = await runSocraticNegotiation(
      { currentSplits, proposedSplits, proposerRole: proposerRole as MemberRole, rationale, contextNotes },
      MEMBERS
    );

    if (!isValidSplitMap(result.compromiseSplits)) {
      return NextResponse.json(
        { error: 'The AI suggestion failed the 10,000 basis point balance check.' },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in /api/negotiate:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
