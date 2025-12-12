import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { intent, payload } = await req.json();

  console.log('[Approve]', intent, payload);

  // TEMP: simulate success
  return NextResponse.json({ success: true });
}
