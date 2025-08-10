import { Counter, Gauge, Histogram, Summary, Registry } from 'prom-client';

export const registry = new Registry();

type MetricConfig = {
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[];
  percentiles?: number[];
};

export function getOrCreateHistogram(config: MetricConfig): Histogram<string> {
  const existing = registry.getSingleMetric(config.name);
  if (existing) {
    if (!(existing instanceof Histogram)) {
      throw new Error(`Metric ${config.name} exists but is not a Histogram`);
    }
    return existing;
  }
  const metric = new Histogram(config);
  registry.registerMetric(metric);
  return metric;
}

export function getOrCreateCounter(config: MetricConfig): Counter<string> {
  const existing = registry.getSingleMetric(config.name);
  if (existing) {
    if (!(existing instanceof Counter)) {
      throw new Error(`Metric ${config.name} exists but is not a Counter`);
    }
    return existing;
  }
  const metric = new Counter(config);
  registry.registerMetric(metric);
  return metric;
}

export function getOrCreateGauge(config: MetricConfig) {
  return registry.getSingleMetric(config.name) || new Gauge(config);
}

export function getOrCreateSummary(config: MetricConfig) {
  return registry.getSingleMetric(config.name) || new Summary(config);
}
