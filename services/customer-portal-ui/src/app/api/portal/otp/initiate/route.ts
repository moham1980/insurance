import { NextResponse } from 'next/server';

const DEMO_OTP = '111111';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phoneNumber = body?.phoneNumber;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Phone number is required' } },
        { status: 400 },
      );
    }

    const sessionId = `otp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    console.log(`[DEMO OTP] Phone: ${phoneNumber}, Session: ${sessionId}, Code: ${DEMO_OTP}`);

    return NextResponse.json({
      success: true,
      data: { sessionId, message: 'کد یکبار مصرف ارسال شد (دمو: 111111)' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to initiate OTP' } },
      { status: 500 },
    );
  }
}

