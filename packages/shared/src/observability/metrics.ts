import { Injectable } from '@nestjs/common';
import type { TraceContext } from './tracing';

interface MetricEntry {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

interface CounterEntry {
  name: string;
  labels: Record<string, string>;
  count: number;
}

interface HistogramEntry {
  name: string;
  labels: Record<string, string>;
  count: number;
  sum: number;
  buckets: Record<string, number>;
}

const COUNTERS = new Map<string, CounterEntry>();
const HISTOGRAMS = new Map<string, HistogramEntry>();
const GAUGES = new Map<string, MetricEntry>();

function labelKey(labels: Record<string, string>): string {
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(',');
}

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function bucketIndex(value: number, buckets: number[]): number {
  for (let i = 0; i < buckets.length; i++) {
    if (value <= buckets[i]) return i;
  }
  return buckets.length;
}

@Injectable()
export class MetricsService {
  static incCounter(name: string, labels: Record<string, string> = {}): void {
    const key = `${name}:${labelKey(labels)}`;
    const existing = COUNTERS.get(key);
    if (existing) {
      existing.count++;
    } else {
      COUNTERS.set(key, { name, labels, count: 1 });
    }
  }

  static observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${labelKey(labels)}`;
    const buckets = DEFAULT_BUCKETS;
    const existing = HISTOGRAMS.get(key);
    if (existing) {
      existing.count++;
      existing.sum += value;
      const bIdx = bucketIndex(value, buckets);
      const bKey = `le_${buckets[bIdx] ?? '+Inf'}`;
      existing.buckets[bKey] = (existing.buckets[bKey] || 0) + 1;
    } else {
      const bIdx = bucketIndex(value, buckets);
      const bKey = `le_${buckets[bIdx] ?? '+Inf'}`;
      HISTOGRAMS.set(key, {
        name,
        labels,
        count: 1,
        sum: value,
        buckets: { [bKey]: 1 },
      });
    }
  }

  static setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${labelKey(labels)}`;
    GAUGES.set(key, { name, labels, value, timestamp: Date.now() });
  }

  static recordRequest(
    method: string,
    path: string,
    status: number,
    durationMs: number,
    traceCtx?: TraceContext
  ): void {
    const labels: Record<string, string> = {
      method,
      path: path.split('?')[0],
      status: String(status),
    };
    if (traceCtx?.tenantId) labels.tenant = traceCtx.tenantId;

    MetricsService.incCounter('http_requests_total', labels);
    MetricsService.observeHistogram('http_request_duration_seconds', durationMs / 1000, labels);
  }

  static recordEvent(topic: string, eventType: string, success: boolean): void {
    MetricsService.incCounter('events_published_total', {
      topic,
      eventType,
      success: String(success),
    });
  }

  static recordKafkaLag(consumerGroup: string, topic: string, lag: number): void {
    MetricsService.setGauge('kafka_consumer_lag', lag, { consumerGroup, topic });
  }

  static recordDlqDepth(topic: string, depth: number): void {
    MetricsService.setGauge('dlq_depth', depth, { topic });
  }

  static exportPrometheus(): string {
    const lines: string[] = [];

    for (const [key, counter] of COUNTERS) {
      const labelStr = Object.entries(counter.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      lines.push(`# TYPE ${counter.name} counter`);
      lines.push(`${counter.name}{${labelStr}} ${counter.count}`);
    }

    for (const [key, hist] of HISTOGRAMS) {
      const labelStr = Object.entries(hist.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      lines.push(`# TYPE ${hist.name} histogram`);
      for (const [bKey, bVal] of Object.entries(hist.buckets)) {
        lines.push(`${hist.name}_bucket{${labelStr},${bKey}} ${bVal}`);
      }
      lines.push(`${hist.name}_count{${labelStr}} ${hist.count}`);
      lines.push(`${hist.name}_sum{${labelStr}} ${hist.sum}`);
    }

    for (const [key, gauge] of GAUGES) {
      const labelStr = Object.entries(gauge.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      lines.push(`# TYPE ${gauge.name} gauge`);
      lines.push(`${gauge.name}{${labelStr}} ${gauge.value}`);
    }

    return lines.join('\n');
  }

  static reset(): void {
    COUNTERS.clear();
    HISTOGRAMS.clear();
    GAUGES.clear();
  }
}
