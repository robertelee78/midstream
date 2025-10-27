/**
 * Google Provider Handler
 *
 * Handles communication with Google AI (Gemini) API
 */

const https = require('https');

class GoogleProvider {
  constructor({ apiKey, endpoint, connectionPool }) {
    this.name = 'google';
    this.apiKey = apiKey;
    this.baseUrl = endpoint || 'https://generativelanguage.googleapis.com/v1';
    this.connectionPool = connectionPool;
  }

  /**
   * Send request to Google AI API
   */
  async sendRequest(requestData) {
    const endpoint = this.getEndpoint(requestData.url);
    const url = `${this.baseUrl}${endpoint}?key=${this.apiKey}`;

    const options = {
      method: requestData.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      throw new Error(`Google AI API request failed: ${error.message}`);
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
            reject(new Error(`Failed to parse Google AI response: ${error.message}`));
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
    if (!url) return '/models/gemini-pro:generateContent';

    // Extract model and method
    const match = url.match(/\/v1\/(.+)/);
    return match ? `/${match[1]}` : '/models/gemini-pro:generateContent';
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
    const endpoint = this.getEndpoint(requestData.url).replace(':generateContent', ':streamGenerateContent');
    const url = `${this.baseUrl}${endpoint}?key=${this.apiKey}`;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

          // Google uses newline-delimited JSON
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
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

module.exports = GoogleProvider;
