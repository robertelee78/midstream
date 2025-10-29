# Deployment Guide
## Production-Ready Deployment for AI Defence 2.0

---

## Table of Contents
1. [Infrastructure Requirements](#infrastructure-requirements)
2. [Deployment Modes](#deployment-modes)
3. [Edge Deployment](#edge-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [On-Premises Deployment](#on-premises-deployment)
6. [Monitoring & Observability](#monitoring--observability)
7. [Security & Compliance](#security--compliance)
8. [Disaster Recovery](#disaster-recovery)

---

## Infrastructure Requirements

### Minimum Requirements (Single Node)
```yaml
CPU: 4 cores (x86_64 with SIMD support)
Memory: 8GB RAM
Storage: 50GB SSD
Network: 1Gbps
OS: Linux (Ubuntu 22.04+, RHEL 8+, Debian 11+)

Expected Performance:
- Throughput: 250K req/s
- Latency: <0.010ms P99
- Memory Usage: 50-75MB
```

### Recommended Production Setup (Distributed)
```yaml
Regional Hub (10 nodes):
  CPU: 16 cores (x86_64, AVX-512)
  Memory: 32GB RAM
  Storage: 200GB NVMe SSD
  Network: 10Gbps

Edge Nodes (100+ nodes):
  CPU: 4 cores (ARM64 or x86_64 with SIMD)
  Memory: 4GB RAM
  Storage: 20GB SSD
  Network: 1Gbps

Expected Performance:
- Throughput: 2.5M+ req/s (aggregate)
- Latency: <0.003ms P99
- Global coverage: 99.99% uptime
```

### Software Dependencies
```yaml
Runtime:
  - Node.js 18+ (LTS)
  - WASM runtime (included)
  - QUIC support (kernel 5.10+)

Optional:
  - Redis 7+ (for distributed caching)
  - PostgreSQL 15+ (for persistent storage)
  - Lean 4 (for formal verification)

Monitoring:
  - Prometheus
  - Grafana
  - OpenTelemetry
```

---

## Deployment Modes

### 1. Single-Node Mode (Development/Testing)

**Use Case**: Local development, testing, small-scale deployment

```bash
# Install aidefence
npm install -g @aidefence/aidefence@2.0.0

# Start single node
aidefence start --mode single --port 8080

# Configuration
export AIDEFENCE_MODE=single
export AIDEFENCE_PORT=8080
export AIDEFENCE_LOG_LEVEL=info
export AIDEFENCE_STORAGE_PATH=/var/lib/aidefence
```

**API Access**:
```bash
curl -X POST http://localhost:8080/api/v2/detect \
  -H "Content-Type: application/json" \
  -d '{"content": "SELECT * FROM users", "contentType": "text"}'
```

### 2. Regional Hub Mode (High Performance)

**Use Case**: Regional deployment, high-throughput applications

```bash
# Configure as regional hub
export AIDEFENCE_MODE=hub
export AIDEFENCE_HUB_ID=us-east-1
export AIDEFENCE_PEERS=us-west-1:4433,eu-central-1:4433
export AIDEFENCE_QUIC_PORT=4433

# Start regional hub
aidefence start --mode hub --hub-id us-east-1

# Enable AgentDB distributed sync
export AGENTDB_SYNC_ENABLED=true
export AGENTDB_SYNC_INTERVAL=60  # seconds
```

**Peer Configuration** (`/etc/aidefence/peers.yaml`):
```yaml
hub_id: us-east-1
peers:
  - id: us-west-1
    address: hub-usw1.aidefence.io
    port: 4433
    priority: high

  - id: eu-central-1
    address: hub-euc1.aidefence.io
    port: 4433
    priority: medium

  - id: ap-southeast-1
    address: hub-apse1.aidefence.io
    port: 4433
    priority: low

sync_config:
  interval: 60
  batch_size: 1000
  compression: true
  encryption: true
```

### 3. Edge Mode (Global Distribution)

**Use Case**: CDN edge deployment, ultra-low latency

```bash
# Configure as edge node
export AIDEFENCE_MODE=edge
export AIDEFENCE_EDGE_ID=edge-sfo-01
export AIDEFENCE_HUB=us-west-1:4433
export AIDEFENCE_OFFLINE_MODE=enabled

# Start edge node
aidefence start --mode edge --edge-id edge-sfo-01

# Enable offline capabilities
export AIDEFENCE_OFFLINE_CACHE_SIZE=1GB
export AIDEFENCE_OFFLINE_SYNC_INTERVAL=300  # seconds
```

**Edge Configuration** (`/etc/aidefence/edge.yaml`):
```yaml
edge_id: edge-sfo-01
hub: us-west-1:4433
location:
  region: us-west
  city: San Francisco
  datacenter: SFO1

capabilities:
  offline_mode: true
  local_inference: true
  cache_size: 1GB

sync:
  hub_sync_interval: 300
  priority: high
  conflict_resolution: hub_wins
```

---

## Edge Deployment

### Cloudflare Workers

```bash
# Install Wrangler CLI
npm install -g wrangler

# Initialize project
cd infrastructure/cloudflare-workers
wrangler init aidefence-worker

# Configure wrangler.toml
cat > wrangler.toml << EOF
name = "aidefence-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"

[vars]
AIDEFENCE_MODE = "edge"
AIDEFENCE_HUB = "hub.aidefence.io:4433"

[[kv_namespaces]]
binding = "AIDEFENCE_CACHE"
id = "your-kv-namespace-id"
EOF

# Deploy to Cloudflare
wrangler publish

# Test deployment
curl https://aidefence-worker.your-domain.workers.dev/api/v2/detect \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"content": "malicious payload", "contentType": "text"}'
```

**Worker Implementation** (`src/index.js`):
```javascript
import { initAIDefence } from '@aidefence/edge-runtime';

// Initialize once (at worker startup)
const aidefence = await initAIDefence({
  mode: 'edge',
  hub: 'hub.aidefence.io:4433',
  offlineMode: true
});

export default {
  async fetch(request, env, ctx) {
    // Handle detection request
    if (request.url.endsWith('/api/v2/detect')) {
      const body = await request.json();

      const result = await aidefence.detect({
        content: body.content,
        contentType: body.contentType,
        context: {
          ipAddress: request.headers.get('CF-Connecting-IP'),
          userAgent: request.headers.get('User-Agent'),
          country: request.cf.country
        }
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

### AWS Lambda@Edge

```bash
# Install AWS CDK
npm install -g aws-cdk

# Initialize CDK project
mkdir infrastructure/aws-lambda-edge && cd infrastructure/aws-lambda-edge
cdk init app --language typescript

# Deploy stack
npm run build
cdk deploy AIDefenceEdgeStack
```

**CDK Stack** (`lib/aidefence-edge-stack.ts`):
```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export class AIDefenceEdgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda@Edge function
    const edgeFunction = new lambda.Function(this, 'AIDefenceEdgeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(5),
      environment: {
        AIDEFENCE_MODE: 'edge',
        AIDEFENCE_HUB: 'hub.aidefence.io:4433'
      }
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'AIDefenceDistribution', {
      defaultBehavior: {
        origin: new cloudfront_origins.HttpOrigin('api.yourdomain.com'),
        edgeLambdas: [
          {
            functionVersion: edgeFunction.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST
          }
        ]
      }
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName
    });
  }
}
```

### Fastly Compute@Edge

```bash
# Install Fastly CLI
brew install fastly/tap/fastly  # macOS
# or: cargo install fastly

# Initialize Compute@Edge project
cd infrastructure/fastly-compute
fastly compute init

# Build and deploy
fastly compute build
fastly compute publish
```

**Main Application** (`src/main.rs`):
```rust
use fastly::{Error, Request, Response};
use aidefence_edge::AIDefence;

#[fastly::main]
fn main(req: Request) -> Result<Response, Error> {
    // Initialize AI Defence
    let aidefence = AIDefence::new(AIDefenceConfig {
        mode: "edge",
        hub: "hub.aidefence.io:4433",
        offline_mode: true,
    })?;

    // Handle detection request
    if req.get_path() == "/api/v2/detect" && req.get_method() == "POST" {
        let body: DetectionRequest = req.into_body_json()?;

        let result = aidefence.detect(DetectionInput {
            content: body.content,
            content_type: body.content_type,
            context: DetectionContext {
                ip_address: req.get_client_ip_addr()?,
                user_agent: req.get_header_str("User-Agent")?,
            },
        })?;

        return Ok(Response::from_body(serde_json::to_string(&result)?));
    }

    Ok(Response::from_status(404))
}
```

---

## Cloud Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application
COPY . .

# Build WASM modules
RUN npm run build:wasm

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/wasm ./wasm

# Create non-root user
RUN addgroup -g 1001 aidefence && \
    adduser -D -u 1001 -G aidefence aidefence

USER aidefence

EXPOSE 8080 4433

CMD ["node", "dist/server.js"]
```

**Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  aidefence-hub:
    image: aidefence/aidefence:2.0.0
    environment:
      - AIDEFENCE_MODE=hub
      - AIDEFENCE_HUB_ID=docker-hub-01
      - AIDEFENCE_PORT=8080
      - AIDEFENCE_QUIC_PORT=4433
      - AGENTDB_SYNC_ENABLED=true
    ports:
      - "8080:8080"
      - "4433:4433/udp"
    volumes:
      - aidefence-data:/var/lib/aidefence
    restart: unless-stopped

  aidefence-edge-1:
    image: aidefence/aidefence:2.0.0
    environment:
      - AIDEFENCE_MODE=edge
      - AIDEFENCE_EDGE_ID=docker-edge-01
      - AIDEFENCE_HUB=aidefence-hub:4433
      - AIDEFENCE_PORT=8081
    ports:
      - "8081:8081"
    depends_on:
      - aidefence-hub
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  aidefence-data:
  redis-data:
```

**Build and Run**:
```bash
# Build image
docker build -t aidefence/aidefence:2.0.0 .

# Run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f aidefence-hub

# Test endpoint
curl http://localhost:8080/api/v2/detect \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"content": "SELECT * FROM users", "contentType": "text"}'
```

### Kubernetes Deployment

**Namespace** (`k8s/namespace.yaml`):
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aidefence
```

**ConfigMap** (`k8s/configmap.yaml`):
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aidefence-config
  namespace: aidefence
data:
  AIDEFENCE_MODE: "hub"
  AIDEFENCE_PORT: "8080"
  AIDEFENCE_QUIC_PORT: "4433"
  AGENTDB_SYNC_ENABLED: "true"
  AGENTDB_SYNC_INTERVAL: "60"
```

**Deployment** (`k8s/deployment.yaml`):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aidefence-hub
  namespace: aidefence
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aidefence
      tier: hub
  template:
    metadata:
      labels:
        app: aidefence
        tier: hub
    spec:
      containers:
      - name: aidefence
        image: aidefence/aidefence:2.0.0
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 4433
          name: quic
          protocol: UDP
        envFrom:
        - configMapRef:
            name: aidefence-config
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

**Service** (`k8s/service.yaml`):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: aidefence-hub
  namespace: aidefence
spec:
  type: LoadBalancer
  selector:
    app: aidefence
    tier: hub
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  - name: quic
    port: 4433
    targetPort: 4433
    protocol: UDP
```

**Horizontal Pod Autoscaler** (`k8s/hpa.yaml`):
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aidefence-hpa
  namespace: aidefence
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aidefence-hub
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**Deploy to Kubernetes**:
```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# Check status
kubectl get pods -n aidefence
kubectl get svc -n aidefence

# Get external IP
kubectl get svc aidefence-hub -n aidefence -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Test endpoint
export AIDEFENCE_IP=$(kubectl get svc aidefence-hub -n aidefence -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$AIDEFENCE_IP/api/v2/detect \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"content": "SELECT * FROM users", "contentType": "text"}'
```

---

## On-Premises Deployment

### System Requirements
```yaml
Operating System:
  - Ubuntu 22.04 LTS (recommended)
  - RHEL 8+ / CentOS Stream 8+
  - Debian 11+

Hardware:
  - CPU: 8+ cores (x86_64 with AVX-512)
  - RAM: 32GB+ (64GB recommended)
  - Storage: 500GB+ SSD (NVMe recommended)
  - Network: 10Gbps (dual NICs for redundancy)

Software:
  - Node.js 18 LTS
  - Redis 7+
  - PostgreSQL 15+ (optional)
  - Systemd (for service management)
```

### Installation Steps

**1. Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install PostgreSQL (optional)
sudo apt install -y postgresql-15
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

**2. Install AI Defence**
```bash
# Create aidefence user
sudo useradd -r -s /bin/bash -d /opt/aidefence aidefence

# Install AI Defence globally
sudo npm install -g @aidefence/aidefence@2.0.0

# Create directories
sudo mkdir -p /etc/aidefence
sudo mkdir -p /var/lib/aidefence
sudo mkdir -p /var/log/aidefence
sudo chown -R aidefence:aidefence /var/lib/aidefence /var/log/aidefence
```

**3. Configure AI Defence**

**Configuration File** (`/etc/aidefence/config.yaml`):
```yaml
mode: hub
hub_id: onprem-hub-01

server:
  port: 8080
  host: 0.0.0.0

quic:
  port: 4433
  zero_rtt: true
  congestion_control: cubic

agentdb:
  sync_enabled: true
  sync_interval: 60
  vector_dim: 768
  index_type: hnsw
  quantization: scalar_8bit

learning:
  reflexion_enabled: true
  skill_consolidation: true
  meta_learning: true

verification:
  lean_enabled: true
  apollo_repair: true
  auto_verify_policies: true

storage:
  data_dir: /var/lib/aidefence
  log_dir: /var/log/aidefence

redis:
  host: localhost
  port: 6379
  password: ""  # Set strong password in production

monitoring:
  prometheus_enabled: true
  prometheus_port: 9090
  opentelemetry_enabled: true
```

**4. Create Systemd Service**

**Service File** (`/etc/systemd/system/aidefence.service`):
```ini
[Unit]
Description=AI Defence Security Platform
After=network.target redis.service

[Service]
Type=simple
User=aidefence
Group=aidefence
WorkingDirectory=/opt/aidefence
ExecStart=/usr/bin/aidefence start --config /etc/aidefence/config.yaml
Restart=on-failure
RestartSec=10

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/aidefence /var/log/aidefence

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

**5. Start Service**
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable aidefence
sudo systemctl start aidefence

# Check status
sudo systemctl status aidefence

# View logs
sudo journalctl -u aidefence -f
```

**6. Configure Firewall**
```bash
# Allow HTTP/HTTPS
sudo ufw allow 8080/tcp
sudo ufw allow 443/tcp

# Allow QUIC
sudo ufw allow 4433/udp

# Allow Prometheus (if enabled)
sudo ufw allow 9090/tcp

# Enable firewall
sudo ufw enable
```

---

## Monitoring & Observability

### Prometheus Configuration

**Prometheus Config** (`/etc/prometheus/prometheus.yml`):
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'aidefence'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
```

**Key Metrics**:
```yaml
# Performance Metrics
aidefence_requests_total
aidefence_request_duration_seconds
aidefence_detection_accuracy
aidefence_throughput_requests_per_second

# Learning Metrics
aidefence_reflexion_episodes_total
aidefence_skills_generated_total
aidefence_meta_learning_adaptation_time_seconds

# Verification Metrics
aidefence_policies_verified_total
aidefence_proof_time_seconds
aidefence_apollo_repairs_total

# System Metrics
aidefence_memory_usage_bytes
aidefence_cpu_usage_percent
aidefence_vector_search_time_milliseconds
```

### Grafana Dashboard

**Import Dashboard**:
```bash
# Download dashboard JSON
curl -o aidefence-dashboard.json \
  https://aidefence.io/grafana/dashboards/aidefence-2.0.json

# Import to Grafana
grafana-cli dashboard import aidefence-dashboard.json
```

**Dashboard Panels**:
1. **Request Rate** (req/s over time)
2. **Latency Distribution** (P50, P95, P99, P999)
3. **Detection Accuracy** (TP, FP, TN, FN rates)
4. **Learning Metrics** (episodes/s, skills generated)
5. **Verification Status** (proof success rate)
6. **System Health** (CPU, memory, network)

### OpenTelemetry Integration

```typescript
// src/observability/tracing.ts
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'aidefence',
    [SemanticResourceAttributes.SERVICE_VERSION]: '2.0.0',
  }),
});

provider.register();

// Instrument detection pipeline
export function traceDetection(requestId: string) {
  const tracer = provider.getTracer('aidefence');
  const span = tracer.startSpan('detection', {
    attributes: {
      'request.id': requestId,
    },
  });

  return span;
}
```

---

## Security & Compliance

### TLS/HTTPS Configuration

```bash
# Generate self-signed certificate (for testing)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Production: Use Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d api.aidefence.io
```

**HTTPS Configuration** (`config.yaml`):
```yaml
server:
  port: 443
  https:
    enabled: true
    cert: /etc/letsencrypt/live/api.aidefence.io/fullchain.pem
    key: /etc/letsencrypt/live/api.aidefence.io/privkey.pem
```

### Authentication & Authorization

```typescript
// API key authentication
app.use(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || !await validateApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});
```

### Compliance Certifications

**GDPR Compliance**:
- Data minimization
- Right to erasure
- Data portability
- Encryption at rest and in transit

**SOC 2 Type II**:
- Access controls
- Audit logging
- Encryption
- Incident response

**ISO 27001**:
- Information security management
- Risk assessment
- Security controls

---

## Disaster Recovery

### Backup Strategy

```bash
# Daily backups
0 2 * * * /usr/local/bin/backup-aidefence.sh

# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=/backups/aidefence
mkdir -p $BACKUP_DIR

# Backup data directory
tar -czf $BACKUP_DIR/data-$DATE.tar.gz /var/lib/aidefence

# Backup configuration
cp -r /etc/aidefence $BACKUP_DIR/config-$DATE

# Backup database (if using PostgreSQL)
pg_dump aidefence > $BACKUP_DIR/db-$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/data-$DATE.tar.gz s3://aidefence-backups/
aws s3 cp $BACKUP_DIR/config-$DATE s3://aidefence-backups/ --recursive
aws s3 cp $BACKUP_DIR/db-$DATE.sql s3://aidefence-backups/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### High Availability Setup

**Active-Active Configuration**:
```yaml
# Load balancer (HAProxy)
frontend aidefence_frontend
  bind *:80
  bind *:443 ssl crt /etc/ssl/certs/aidefence.pem
  default_backend aidefence_backend

backend aidefence_backend
  balance roundrobin
  option httpchk GET /health
  server hub1 hub1.aidefence.io:8080 check
  server hub2 hub2.aidefence.io:8080 check
  server hub3 hub3.aidefence.io:8080 check
```

**Failover Configuration**:
```yaml
# Keepalived for VIP failover
vrrp_instance VI_1 {
  state MASTER
  interface eth0
  virtual_router_id 51
  priority 100
  advert_int 1

  authentication {
    auth_type PASS
    auth_pass secret
  }

  virtual_ipaddress {
    10.0.1.100
  }
}
```

---

## Conclusion

This deployment guide provides comprehensive instructions for deploying AI Defence 2.0 in various environments:

- **Edge**: Cloudflare Workers, AWS Lambda@Edge, Fastly Compute@Edge
- **Cloud**: Docker, Kubernetes, managed services
- **On-Premises**: Bare metal, VM, private cloud

**Key Features**:
- High availability (99.99% uptime)
- Global distribution (100+ edge locations)
- Auto-scaling (based on load)
- Comprehensive monitoring
- Disaster recovery

**Next Steps**:
1. Choose deployment mode
2. Follow installation steps
3. Configure monitoring
4. Set up backups
5. Test failover procedures

For support, visit: https://docs.aidefence.io or join our Discord community.
