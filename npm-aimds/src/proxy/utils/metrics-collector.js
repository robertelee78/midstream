/**
 * Metrics Collector
 *
 * Collects and exports performance metrics for monitoring and analysis
 */

class MetricsCollector {
  constructor({ enabled = true, flushInterval = 60000 }) {
    this.enabled = enabled;
    this.flushInterval = flushInterval;

    // Metrics storage
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        blocked: 0,
      },
      detections: {
        total: 0,
        byThreatType: {},
        bySeverity: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
      },
      performance: {
        requestDurations: [],
        detectionTimes: [],
        forwardTimes: [],
      },
      errors: {
        total: 0,
        byType: {},
      },
    };

    // Start periodic flush
    if (this.enabled) {
      this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }
  }

  /**
   * Record a request
   */
  recordRequest(duration, severity) {
    if (!this.enabled) return;

    this.metrics.requests.total++;
    this.metrics.requests.successful++;

    // Track duration
    this.metrics.performance.requestDurations.push(duration);

    // Keep only last 1000 durations
    if (this.metrics.performance.requestDurations.length > 1000) {
      this.metrics.performance.requestDurations.shift();
    }
  }

  /**
   * Record blocked request
   */
  recordBlockedRequest(severity) {
    if (!this.enabled) return;

    this.metrics.requests.total++;
    this.metrics.requests.blocked++;
    this.metrics.detections.bySeverity[severity]++;
  }

  /**
   * Record detection
   */
  recordDetection(detectionResult) {
    if (!this.enabled) return;

    this.metrics.detections.total++;

    // Count by severity
    this.metrics.detections.bySeverity[detectionResult.severity]++;

    // Count by threat type
    for (const threat of detectionResult.threats) {
      const type = threat.type;
      this.metrics.detections.byThreatType[type] =
        (this.metrics.detections.byThreatType[type] || 0) + 1;
    }
  }

  /**
   * Record detection time
   */
  recordDetectionTime(timeMs) {
    if (!this.enabled) return;

    this.metrics.performance.detectionTimes.push(timeMs);

    // Keep only last 1000 times
    if (this.metrics.performance.detectionTimes.length > 1000) {
      this.metrics.performance.detectionTimes.shift();
    }
  }

  /**
   * Record forward time (time to call provider API)
   */
  recordForwardTime(timeMs) {
    if (!this.enabled) return;

    this.metrics.performance.forwardTimes.push(timeMs);

    // Keep only last 1000 times
    if (this.metrics.performance.forwardTimes.length > 1000) {
      this.metrics.performance.forwardTimes.shift();
    }
  }

  /**
   * Record error
   */
  recordError(errorType) {
    if (!this.enabled) return;

    this.metrics.requests.failed++;
    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] =
      (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    const snapshot = JSON.parse(JSON.stringify(this.metrics));

    // Calculate statistics
    snapshot.performance.avgRequestDuration = this.calculateAverage(
      this.metrics.performance.requestDurations
    );
    snapshot.performance.avgDetectionTime = this.calculateAverage(
      this.metrics.performance.detectionTimes
    );
    snapshot.performance.avgForwardTime = this.calculateAverage(
      this.metrics.performance.forwardTimes
    );

    snapshot.performance.p95RequestDuration = this.calculatePercentile(
      this.metrics.performance.requestDurations,
      95
    );
    snapshot.performance.p95DetectionTime = this.calculatePercentile(
      this.metrics.performance.detectionTimes,
      95
    );

    // Calculate rates
    snapshot.requests.blockRate =
      this.metrics.requests.total > 0
        ? (this.metrics.requests.blocked / this.metrics.requests.total) * 100
        : 0;

    snapshot.requests.successRate =
      this.metrics.requests.total > 0
        ? (this.metrics.requests.successful / this.metrics.requests.total) * 100
        : 0;

    return snapshot;
  }

  /**
   * Calculate average of array
   */
  calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;

    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus() {
    const metrics = this.getMetrics();
    const lines = [];

    // Requests
    lines.push('# HELP aimds_requests_total Total number of requests');
    lines.push('# TYPE aimds_requests_total counter');
    lines.push(`aimds_requests_total ${metrics.requests.total}`);

    lines.push('# HELP aimds_requests_blocked Blocked requests');
    lines.push('# TYPE aimds_requests_blocked counter');
    lines.push(`aimds_requests_blocked ${metrics.requests.blocked}`);

    // Detections
    lines.push('# HELP aimds_detections_total Total detections');
    lines.push('# TYPE aimds_detections_total counter');
    lines.push(`aimds_detections_total ${metrics.detections.total}`);

    // Detection by severity
    for (const [severity, count] of Object.entries(metrics.detections.bySeverity)) {
      lines.push(`aimds_detections_severity{severity="${severity}"} ${count}`);
    }

    // Performance
    lines.push('# HELP aimds_request_duration_ms Request duration in milliseconds');
    lines.push('# TYPE aimds_request_duration_ms gauge');
    lines.push(`aimds_request_duration_ms{quantile="0.95"} ${metrics.performance.p95RequestDuration}`);
    lines.push(`aimds_request_duration_ms{quantile="0.5"} ${metrics.performance.avgRequestDuration}`);

    lines.push('# HELP aimds_detection_time_ms Detection time in milliseconds');
    lines.push('# TYPE aimds_detection_time_ms gauge');
    lines.push(`aimds_detection_time_ms{quantile="0.95"} ${metrics.performance.p95DetectionTime}`);
    lines.push(`aimds_detection_time_ms{quantile="0.5"} ${metrics.performance.avgDetectionTime}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Flush metrics (can be overridden to send to external system)
   */
  flush() {
    // Default implementation: just log to console
    const metrics = this.getMetrics();
    console.log('[Metrics]', JSON.stringify(metrics, null, 2));
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        blocked: 0,
      },
      detections: {
        total: 0,
        byThreatType: {},
        bySeverity: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
      },
      performance: {
        requestDurations: [],
        detectionTimes: [],
        forwardTimes: [],
      },
      errors: {
        total: 0,
        byType: {},
      },
    };
  }

  /**
   * Stop metrics collection
   */
  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

module.exports = MetricsCollector;
