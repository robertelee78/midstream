/**
 * Connection Pool
 *
 * Manages HTTP/HTTPS connection pooling for improved performance
 */

const http = require('http');
const https = require('https');

class ConnectionPool {
  constructor({ maxConnections = 50, timeout = 30000, keepAlive = true }) {
    this.maxConnections = maxConnections;
    this.timeout = timeout;
    this.keepAlive = keepAlive;

    // Create HTTP agents
    this.httpAgent = new http.Agent({
      keepAlive: this.keepAlive,
      maxSockets: this.maxConnections,
      timeout: this.timeout,
    });

    this.httpsAgent = new https.Agent({
      keepAlive: this.keepAlive,
      maxSockets: this.maxConnections,
      timeout: this.timeout,
    });

    // Connection statistics
    this.stats = {
      activeConnections: 0,
      totalConnections: 0,
      failedConnections: 0,
      pooledConnections: 0,
    };
  }

  /**
   * Get appropriate agent for URL
   */
  getAgent(url) {
    return url.startsWith('https') ? this.httpsAgent : this.httpAgent;
  }

  /**
   * Make HTTP request using pool
   */
  async request(url, options = {}, body = null) {
    const parsedUrl = new URL(url);
    const agent = this.getAgent(url);

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      agent,
    };

    this.stats.activeConnections++;
    this.stats.totalConnections++;

    return new Promise((resolve, reject) => {
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          this.stats.activeConnections--;

          try {
            const responseBody = data ? JSON.parse(data) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: responseBody,
            });
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        this.stats.activeConnections--;
        this.stats.failedConnections++;
        reject(error);
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Make streaming request
   */
  streamRequest(url, options = {}, body = null, onData) {
    const parsedUrl = new URL(url);
    const agent = this.getAgent(url);

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'POST',
      headers: options.headers || {},
      agent,
    };

    this.stats.activeConnections++;
    this.stats.totalConnections++;

    return new Promise((resolve, reject) => {
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.request(requestOptions, (res) => {
        res.on('data', (chunk) => {
          if (onData) {
            onData(chunk);
          }
        });

        res.on('end', () => {
          this.stats.activeConnections--;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
          });
        });
      });

      req.on('error', (error) => {
        this.stats.activeConnections--;
        this.stats.failedConnections++;
        reject(error);
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      pooledConnections: this.getPooledConnectionCount(),
    };
  }

  /**
   * Get number of pooled connections
   */
  getPooledConnectionCount() {
    let count = 0;

    // HTTP agent
    const httpSockets = this.httpAgent.sockets;
    for (const key in httpSockets) {
      count += httpSockets[key].length;
    }

    // HTTPS agent
    const httpsSockets = this.httpsAgent.sockets;
    for (const key in httpsSockets) {
      count += httpsSockets[key].length;
    }

    return count;
  }

  /**
   * Close all connections
   */
  destroy() {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }

  /**
   * Check health of connection pool
   */
  healthCheck() {
    const activeRatio = this.stats.activeConnections / this.maxConnections;
    const failureRate = this.stats.totalConnections > 0
      ? this.stats.failedConnections / this.stats.totalConnections
      : 0;

    return {
      healthy: activeRatio < 0.9 && failureRate < 0.1,
      activeRatio,
      failureRate,
      stats: this.getStats(),
    };
  }
}

module.exports = ConnectionPool;
