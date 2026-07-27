import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { MessageBrokerClient } from '@/lib/message-broker';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return new NextResponse('Token required', { status: 401 });
    }

    // Verify JWT token
    const payload = verifyJWT(token);
    if (!payload) {
      return new NextResponse('Invalid token', { status: 401 });
    }

    // Create EventSource response
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const connectedEvent = `data: ${JSON.stringify({
          type: 'connection',
          data: { status: 'connected', userId: payload.sub },
          timestamp: new Date().toISOString(),
        })}\n\n`;
        controller.enqueue(encoder.encode(connectedEvent));

        // Simulate periodic heartbeat
        const heartbeatInterval = setInterval(() => {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            data: {},
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        }, 30000); // 30 seconds

        // Clean up on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          controller.close();
        });

        // Subscribe to actual events from message broker (Kafka/RabbitMQ)
        // Implementation: Message broker integration for real-time event streaming
        const messageBrokerClient = new MessageBrokerClient({
          brokerUrl: process.env.MESSAGE_BROKER_URL || 'localhost:9092',
          topic: 'insurance-events',
          groupId: 'web-ui-sse',
        });

        // Subscribe to relevant event topics
        messageBrokerClient.subscribe(['claim.updated', 'payment.processed', 'fraud.alert', 'policy.issued'], (event) => {
          const eventData = `data: ${JSON.stringify({
            type: event.topic,
            data: event.payload,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        });

        // Clean up on disconnect
        request.signal.addEventListener('abort', () => {
          messageBrokerClient.disconnect();
          clearInterval(heartbeatInterval);
          controller.close();
        });
      },
    });

    return new NextResponse(stream, { headers });
  } catch (error) {
    console.error('Realtime SSE error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
