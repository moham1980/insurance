import { NextResponse } from 'next/server';

const DEMO_OTP = '111111';
const DEMO_TOKEN = 'demo-jwt-token-customer-portal';
const DEMO_USER = {
  id: 'demo-user-001',
  phoneNumber: '09123456789',
  name: 'کاربر دمو',
  tenantId: 'default-tenant',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const otpCode = body?.otp;

    if (!otpCode) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'OTP code is required' } },
        { status: 400 },
      );
    }

    if (otpCode !== DEMO_OTP) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_OTP', message: 'کد اشتباه است (دمو: 111111)' } },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      success: true,
      data: { token: DEMO_TOKEN, user: DEMO_USER },
    });
    response.cookies.set('auth-token', DEMO_TOKEN, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    response.cookies.set('auth-user', JSON.stringify(DEMO_USER), {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify OTP' } },
      { status: 500 },
    );
  }
}
