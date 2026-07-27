import { NextResponse } from 'next/server';

const AUTH_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:18000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${AUTH_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok || !json?.success) {
      return NextResponse.json(json, { status: res.status });
    }

    const response = NextResponse.json({ success: true, data: { user: json.data.user } });
    response.cookies.set('auth-token', json.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    response.cookies.set('auth-user', JSON.stringify(json.data.user), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Login failed' } },
      { status: 500 },
    );
  }
}
