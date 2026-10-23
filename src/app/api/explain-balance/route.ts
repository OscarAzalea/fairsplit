import { NextRequest, NextResponse } from 'next/server';
import { runBalanceAudit } from '@/lib/gemini';
import { MEMBERS } from '@/lib/initial-data';
import { MemberRole } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { memberId, inflows, payoutBatches } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId parameter' }, { status: 400 });
    }

    const member = MEMBERS.find((m) => m.id === memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const audit = await runBalanceAudit(
      memberId as MemberRole,
      member,
      inflows || [],
      payoutBatches || []
    );

    return NextResponse.json(audit);
  } catch (error: unknown) {
    console.error('Error in /api/explain-balance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
