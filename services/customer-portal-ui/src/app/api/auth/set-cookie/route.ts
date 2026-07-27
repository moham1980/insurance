import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, user } = body;

    if (!token) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Token is required' } },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    if (user) {
      response.cookies.set('auth-user', JSON.stringify(user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60,
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to set cookie' } },
      { status: 500 },
    );
  }
}
