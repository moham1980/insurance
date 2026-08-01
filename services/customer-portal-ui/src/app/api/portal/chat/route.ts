import { NextResponse } from 'next/server';

const COPILOT_SERVICE_URL = process.env.COPILOT_SERVICE_URL || 'http://localhost:18030';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, conversationHistory } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'message is required' } },
        { status: 400 },
      );
    }

    // Get auth token from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)auth-token=([^;]+)/);
    const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    // Forward to copilot-service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${COPILOT_SERVICE_URL}/copilot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-AI-Enabled': 'true',
        },
        body: JSON.stringify({
          message,
          conversationHistory: (conversationHistory || []) as ChatHistoryItem[],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || !data.success) {
        return NextResponse.json(
          {
            success: false,
            error: data?.error || { code: 'COPILOT_ERROR', message: 'Failed to get AI response' },
          },
          { status: response.status },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          answer: data.data.answer,
          confidence: data.data.confidence,
          sources: data.data.sources || [],
          model: data.data.model,
          provider: data.data.provider,
          redacted: data.data.redacted,
        },
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: { code: 'TIMEOUT', message: 'AI service timed out' } },
          { status: 504 },
        );
      }

      // Network error — copilot service not running
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'COPILOT_UNAVAILABLE',
            message: 'AI service is not available. Please try again later or contact support.',
          },
        },
        { status: 503 },
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process chat request' } },
      { status: 500 },
    );
  }
}
