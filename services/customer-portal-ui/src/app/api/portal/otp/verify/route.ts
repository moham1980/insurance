import { NextResponse } from 'next/server';

const PORTAL_BASE = process.env.CUSTOMER_PORTAL_URL || 'http://localhost:18035';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phoneNumber = body?.phoneNumber;
    const otpCode = body?.otpCode;

    if (!phoneNumber || !otpCode) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Phone number and OTP code are required' } },
        { status: 400 },
      );
    }

    const res = await fetch(`${PORTAL_BASE}/portal/otp/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber, otp: otpCode }),
    });

    const json = await res.json();

    if (!res.ok || !json?.success) {
      return NextResponse.json(json, { status: res.status });
    }

    return NextResponse.json({ success: true, data: json.data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify OTP' } },
      { status: 500 },
    );
  }
}
