import { NextRequest, NextResponse } from 'next/server';

const AI_GOVERNANCE_URL = process.env.AI_GOVERNANCE_URL || 'http://localhost:18036';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const targetUrl = `${AI_GOVERNANCE_URL}/ai-governance/${path}${searchParams ? '?' + searchParams : ''}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization')! } : {}),
      },
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'AI Governance service unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const targetUrl = `${AI_GOVERNANCE_URL}/ai-governance/${path}`;

  try {
    const body = await request.json();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization')! } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'AI Governance service unavailable' }, { status: 503 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const targetUrl = `${AI_GOVERNANCE_URL}/ai-governance/${path}`;

  try {
    const body = await request.json();
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization')! } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'AI Governance service unavailable' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const targetUrl = `${AI_GOVERNANCE_URL}/ai-governance/${path}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization')! } : {}),
      },
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'AI Governance service unavailable' }, { status: 503 });
  }
}
