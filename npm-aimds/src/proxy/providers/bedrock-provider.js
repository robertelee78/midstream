/**
 * AWS Bedrock Provider Handler
 *
 * Handles communication with AWS Bedrock API
 */

const https = require('https');
const crypto = require('crypto');

class BedrockProvider {
  constructor({ apiKey, endpoint, connectionPool, region = 'us-east-1', credentials }) {
    this.name = 'bedrock';
    this.region = region;
    this.baseUrl = endpoint || `https://bedrock-runtime.${region}.amazonaws.com`;
    this.connectionPool = connectionPool;

    // AWS credentials
    this.credentials = credentials || this.loadAWSCredentials();
  }

  /**
   * Load AWS credentials from environment
   */
  loadAWSCredentials() {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }

  /**
   * Send request to AWS Bedrock API
   */
  async sendRequest(requestData) {
    const endpoint = this.getEndpoint(requestData.url);
    const url = `${this.baseUrl}${endpoint}`;

    const body = JSON.stringify(requestData.body);

    const options = {
      method: requestData.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...this.filterHeaders(requestData.headers),
      },
    };

    // Sign request with AWS SigV4
    const signedOptions = await this.signRequest(url, options, body);

    try {
      const response = await this.makeRequest(url, signedOptions, body);
      return {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
      };
    } catch (error) {
      throw new Error(`AWS Bedrock API request failed: ${error.message}`);
    }
  }

  /**
   * Sign request with AWS Signature Version 4
   */
  async signRequest(url, options, body) {
    const parsedUrl = new URL(url);
    const date = new Date();
    const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');

    const canonicalUri = parsedUrl.pathname;
    const canonicalQueryString = parsedUrl.search.slice(1);

    const canonicalHeaders = `content-type:application/json\nhost:${parsedUrl.hostname}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';

    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const canonicalRequest = `${options.method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/bedrock/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

    const signingKey = this.getSignatureKey(
      this.credentials.secretAccessKey,
      dateStamp,
      this.region,
      'bedrock'
    );

    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorizationHeader = `${algorithm} Credential=${this.credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': authorizationHeader,
        'X-Amz-Date': amzDate,
        ...(this.credentials.sessionToken ? { 'X-Amz-Security-Token': this.credentials.sessionToken } : {}),
      },
    };
  }

  /**
   * Derive signing key
   */
  getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
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
        headers: options.headers,
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
            reject(new Error(`Failed to parse Bedrock response: ${error.message}`));
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
    if (!url) return '/model/anthropic.claude-v2/invoke';

    const match = url.match(/\/(model\/.+)/);
    return match ? `/${match[1]}` : '/model/anthropic.claude-v2/invoke';
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
      'x-amz-date',
      'x-amz-security-token',
    ];

    for (const header of excludeHeaders) {
      delete filtered[header];
      delete filtered[header.toLowerCase()];
    }

    return filtered;
  }
}

module.exports = BedrockProvider;
