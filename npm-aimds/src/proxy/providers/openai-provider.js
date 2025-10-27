/**
 * OpenAI Provider Handler
 *
 * Handles communication with OpenAI API (GPT-3.5, GPT-4, etc.)
 */

const https = require('https');

class OpenAIProvider {
  constructor({ apiKey, endpoint, connectionPool }) {
    this.name = 'openai';
    this.apiKey = apiKey;
    this.baseUrl = endpoint || 'https://api.openai.com/v1';
    this.connectionPool = connectionPool;
  }

  /**
   * Send request to OpenAI API
   */
  async sendRequest(requestData) {
    const endpoint = this.getEndpoint(requestData.url);
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      method: requestData.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
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
      throw new Error(`OpenAI API request failed: ${error.message}`);
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
            reject(new Error(`Failed to parse OpenAI response: ${error.message}`));
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
    if (!url) return '/chat/completions';

    // Extract path after /v1/
    const match = url.match(/\/v1(\/.+)/);
    return match ? match[1] : '/chat/completions';
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
      'authorization',
      'x-forwarded-for',
      'x-real-ip',
    ];

    for (const header of excludeHeaders) {
      delete filtered[header];
      delete filtered[header.toLowerCase()];
    }

    return filtered;
  }

  /**
   * Check if streaming is requested
   */
  isStreamingRequest(requestData) {
    return requestData.body?.stream === true;
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
        'Authorization': `Bearer ${this.apiKey}`,
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

          // Process SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                onChunk(parsed);
              } catch (err) {
                // Ignore parse errors for streaming
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

module.exports = OpenAIProvider;
