/**
 * Anthropic Provider Handler
 *
 * Handles communication with Anthropic API (Claude models)
 */

const https = require('https');

class AnthropicProvider {
  constructor({ apiKey, endpoint, connectionPool }) {
    this.name = 'anthropic';
    this.apiKey = apiKey;
    this.baseUrl = endpoint || 'https://api.anthropic.com/v1';
    this.connectionPool = connectionPool;
    this.apiVersion = '2023-06-01';
  }

  /**
   * Send request to Anthropic API
   */
  async sendRequest(requestData) {
    const endpoint = this.getEndpoint(requestData.url);
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      method: requestData.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
        ...this.filterHeaders(requestData.headers),
      },
    };

    const body = JSON.stringify(requestData.body);

    try {
      const response = await this.makeRequest(url, options, body);
      return {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
      };
    } catch (error) {
      throw new Error(`Anthropic API request failed: ${error.message}`);
    }
  }

  /**
   * Make HTTP request
   */
  async makeRequest(url, options, body) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method,
        headers: {
          ...options.headers,
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const responseBody = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: responseBody,
            });
          } catch (error) {
            reject(new Error(`Failed to parse Anthropic response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Get API endpoint from request URL
   */
  getEndpoint(url) {
    if (!url) return '/messages';

    // Extract path after /v1/
    const match = url.match(/\/v1(\/.+)/);
    return match ? match[1] : '/messages';
  }

  /**
   * Filter sensitive headers
   */
  filterHeaders(headers) {
    const filtered = { ...headers };
    const excludeHeaders = [
      'host',
      'connection',
      'content-length',
      'x-api-key',
      'authorization',
    ];

    for (const header of excludeHeaders) {
      delete filtered[header];
      delete filtered[header.toLowerCase()];
    }

    return filtered;
  }

  /**
   * Handle streaming request
   */
  async sendStreamingRequest(requestData, onChunk) {
    const endpoint = this.getEndpoint(requestData.url);
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
        'Accept': 'text/event-stream',
        ...this.filterHeaders(requestData.headers),
      },
    };

    const body = JSON.stringify(requestData.body);

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method,
        headers: {
          ...options.headers,
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(requestOptions, (res) => {
        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString();

          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              try {
                const parsed = JSON.parse(data);
                onChunk(parsed);
              } catch (err) {
                // Ignore parse errors
              }
            }
          }
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
          });
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

module.exports = AnthropicProvider;
