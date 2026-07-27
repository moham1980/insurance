'use client';

import React from 'react';

export type RealtimeEvent = {
  type: string;
  data: any;
  timestamp: string;
  correlationId?: string;
};

export type RealtimeSubscription = {
  id: string;
  eventTypes: string[];
  callback: (event: RealtimeEvent) => void;
};

class RealtimeManager {
  private eventSource: EventSource | null = null;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (typeof window === 'undefined') return;

    try {
      const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
      const token = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null;
      if (!token) return;

      const url = new URL('/api/realtime', window.location.origin);
      url.searchParams.set('token', token);

      this.eventSource = new EventSource(url.toString());

      this.eventSource.onopen = () => {
        console.log('Realtime connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const realtimeEvent: RealtimeEvent = JSON.parse(event.data);
          this.dispatch(realtimeEvent);
        } catch (error) {
          console.error('Failed to parse realtime event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Realtime connection error:', error);
        this.isConnected = false;
        this.handleReconnect();
      };

      this.eventSource.addEventListener('close', () => {
        console.log('Realtime connection closed');
        this.isConnected = false;
        this.handleReconnect();
      });
    } catch (error) {
      console.error('Failed to create EventSource:', error);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      console.log(`Reconnecting attempt ${this.reconnectAttempts} in ${this.reconnectDelay}ms`);
      this.connect();
    }, this.reconnectDelay);
  }

  private dispatch(event: RealtimeEvent) {
    this.subscriptions.forEach((subscription) => {
      if (subscription.eventTypes.includes(event.type)) {
        subscription.callback(event);
      }
    });
  }

  subscribe(eventTypes: string[], callback: (event: RealtimeEvent) => void): string {
    const id = Math.random().toString(36).substr(2, 9);
    const subscription: RealtimeSubscription = {
      id,
      eventTypes,
      callback,
    };

    this.subscriptions.set(id, subscription);
    return id;
  }

  unsubscribe(subscriptionId: string) {
    this.subscriptions.delete(subscriptionId);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.subscriptions.clear();
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let realtimeManager: RealtimeManager | null = null;

export function getRealtimeManager(): RealtimeManager {
  if (!realtimeManager) {
    realtimeManager = new RealtimeManager();
  }
  return realtimeManager;
}

// React hook for subscribing to realtime events
export function useRealtime(eventTypes: string[], callback: (event: RealtimeEvent) => void) {
  const manager = getRealtimeManager();

  React.useEffect(() => {
    const subscriptionId = manager.subscribe(eventTypes, callback);
    return () => manager.unsubscribe(subscriptionId);
  }, [eventTypes.join(','), callback]);

  return manager;
}
