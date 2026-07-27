// Simple in-memory rate limiter for OTP requests
// In production, use Redis or similar distributed store
const otpRequestLog = new Map<string, number[]>();

function checkRateLimit(phoneNumber: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 3; // Max 3 OTP requests per 10 minutes
  const requests = otpRequestLog.get(phoneNumber) || [];
  const recentRequests = requests.filter((t) => now - t < windowMs);
  if (recentRequests.length >= maxRequests) {
    const oldestInWindow = recentRequests[0];
    const retryAfterSeconds = Math.ceil((windowMs - (now - oldestInWindow)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  recentRequests.push(now);
  otpRequestLog.set(phoneNumber, recentRequests);
  return { allowed: true };
}

import { NextResponse } from 'next/server';

const PORTAL_BASE = process.env.CUSTOMER_PORTAL_URL || 'http://localhost:18035';

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

    // Rate limit check
    const rateLimit = checkRateLimit(phoneNumber);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Too many OTP requests. Please try again later.' } },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 600) } },
      );
    }

    const res = await fetch(`${PORTAL_BASE}/portal/otp/initiate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });

    const json = await res.json();

    if (!res.ok || !json?.success) {
      return NextResponse.json(json, { status: res.status });
    }

    return NextResponse.json({ success: true, data: json.data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to initiate OTP' } },
      { status: 500 },
    );
  }
}
