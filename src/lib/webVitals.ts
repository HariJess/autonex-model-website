/**
 * Core Web Vitals reporting to GA4 (LCP, INP, CLS, FCP, TTFB).
 *
 * Each metric is reported as a `web-vitals` event on window.dataLayer with
 * non_interaction: true (so it doesn't pollute engagement metrics). The push
 * is gated on GA4 being initialized — until the user gives consent and
 * VITE_GA4_MEASUREMENT_ID is set, this module is a no-op.
 *
 * Idempotent: sets window.__webVitalsInitialized so repeat invocations do
 * nothing. Safe to call after every consent event change.
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

declare global {
  interface Window {
    __webVitalsInitialized?: boolean;
    dataLayer?: unknown[];
  }
}

function reportMetric(metric: Metric): void {
  if (typeof window === "undefined" || !window.dataLayer) return;

  // GA4 wants integer event values. CLS is a fraction (~0.05), so we scale by
  // 1000 to keep precision when bucketed in GA4 reports.
  const value = Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value);

  window.dataLayer.push([
    "event",
    metric.name,
    {
      value,
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
      non_interaction: true,
    },
  ]);
}

export function initWebVitals(): void {
  if (typeof window === "undefined") return;
  if (window.__webVitalsInitialized) return;
  window.__webVitalsInitialized = true;

  onCLS(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onFCP(reportMetric);
  onTTFB(reportMetric);
}
