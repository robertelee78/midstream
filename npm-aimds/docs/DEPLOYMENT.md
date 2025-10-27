# AIMDS QUIC Server Deployment Guide

## Production Deployment

### Prerequisites

- Node.js >= 20.0.0
- 4+ CPU cores recommended
- 4GB+ RAM recommended
- Linux/Unix-based OS (recommended)

## Deployment Options

### 1. Standalone Server

**Installation:**
```bash
npm install -g aimds-quic
```

**Configuration:**
```bash
# Create .env file
cat > .env << 'EOF'
PORT=3000
WORKERS=8
THRESHOLD=0.8
MAX_CONNECTIONS=10000
LOG_LEVEL=info
EOF

# Start server
aimds-quic
```

### 2. Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:20-alpine

# Install production dependencies
RUN apk add --no-cache tini

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production --ignore-scripts

# Copy application
COPY . .

# Set proper permissions
RUN chown -R node:node /app

# Use tini for signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Run as non-root user
USER node

# Expose ports
EXPOSE 3000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start server
CMD ["node", "cli.js"]
```

**Build and Run:**
```bash
# Build
docker build -t aimds-quic:latest .

# Run
docker run -d \
  --name aimds-quic \
  -p 3000:3000 \
  -e WORKERS=8 \
  -e THRESHOLD=0.8 \
  --restart unless-stopped \
  aimds-quic:latest

# View logs
docker logs -f aimds-quic
```

### 3. Docker Compose

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  aimds-quic:
    build: .
    image: aimds-quic:latest
    container_name: aimds-quic
    ports:
      - "3000:3000"
      - "9090:9090"
    environment:
      - PORT=3000
      - WORKERS=8
      - THRESHOLD=0.8
      - MAX_CONNECTIONS=10000
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health')"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:
```

**Start Stack:**
```bash
docker-compose up -d
```

### 4. Kubernetes Deployment

**deployment.yaml:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aimds-config
data:
  WORKERS: "8"
  THRESHOLD: "0.8"
  MAX_CONNECTIONS: "10000"
  LOG_LEVEL: "info"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aimds-quic
  labels:
    app: aimds-quic
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aimds-quic
  template:
    metadata:
      labels:
        app: aimds-quic
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: aimds-quic
        image: aimds-quic:latest
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        envFrom:
        - configMapRef:
            name: aimds-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "4000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 20
          timeoutSeconds: 3
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3

---
apiVersion: v1
kind: Service
metadata:
  name: aimds-quic
  labels:
    app: aimds-quic
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: aimds-quic

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aimds-quic-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aimds-quic
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

**Deploy:**
```bash
kubectl apply -f deployment.yaml
kubectl get pods -l app=aimds-quic
kubectl logs -f deployment/aimds-quic
```

### 5. Systemd Service

**Create Service File:**
```bash
sudo cat > /etc/systemd/system/aimds-quic.service << 'EOF'
[Unit]
Description=AIMDS QUIC Server
After=network.target

[Service]
Type=simple
User=aimds
Group=aimds
WorkingDirectory=/opt/aimds-quic
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="WORKERS=8"
ExecStart=/usr/bin/node /opt/aimds-quic/cli.js
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=aimds-quic

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/aimds-quic/data /opt/aimds-quic/logs

[Install]
WantedBy=multi-user.target
EOF
```

**Enable and Start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable aimds-quic
sudo systemctl start aimds-quic
sudo systemctl status aimds-quic
```

## Load Balancing

### Nginx Configuration

```nginx
upstream aimds_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name aimds.example.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=aimds_limit:10m rate=100r/s;
    limit_req zone=aimds_limit burst=200 nodelay;

    location / {
        proxy_pass http://aimds_backend;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_buffering off;
        proxy_cache off;
    }

    location /metrics {
        deny all;
        allow 10.0.0.0/8;
        proxy_pass http://aimds_backend;
    }
}
```

### HAProxy Configuration

```haproxy
global
    maxconn 50000
    log stdout local0

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httplog
    option dontlognull

frontend aimds_frontend
    bind *:80
    default_backend aimds_backend

backend aimds_backend
    balance leastconn
    option httpchk GET /health
    http-check expect status 200

    server aimds1 127.0.0.1:3000 check inter 5s rise 2 fall 3
    server aimds2 127.0.0.1:3001 check inter 5s rise 2 fall 3
    server aimds3 127.0.0.1:3002 check inter 5s rise 2 fall 3
```

## Monitoring Setup

### Prometheus Configuration

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'aimds-quic'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### Grafana Dashboards

Import dashboard for key metrics:
- Request rate and latency
- Worker utilization
- Connection pool stats
- Detection accuracy

## Security Hardening

### 1. Firewall Rules

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow metrics (internal only)
sudo ufw allow from 10.0.0.0/8 to any port 9090

# Enable firewall
sudo ufw enable
```

### 2. SSL/TLS with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d aimds.example.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 3. Rate Limiting

Implement at reverse proxy level (Nginx/HAProxy) or application level.

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup-aimds.sh

BACKUP_DIR="/backups/aimds"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup data directory
tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" /opt/aimds-quic/data

# Keep last 7 days
find "$BACKUP_DIR" -name "data_*.tar.gz" -mtime +7 -delete
```

### Disaster Recovery

1. Regular backups (automated)
2. Multi-region deployment
3. Database replication
4. Configuration as code

## Performance Tuning

### System Configuration

```bash
# Increase file descriptors
ulimit -n 65535

# TCP tuning for high-performance
sudo sysctl -w net.core.somaxconn=65535
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"
```

### Node.js Optimization

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" node cli.js

# Enable CPU profiling
node --cpu-prof cli.js
```

## Troubleshooting

### Common Issues

1. **High latency**
   - Increase worker count
   - Check CPU utilization
   - Review network bottlenecks

2. **Memory leaks**
   - Monitor with `node --trace-gc`
   - Check connection pool cleanup
   - Review worker lifecycle

3. **Connection errors**
   - Verify connection pool limits
   - Check network configuration
   - Review firewall rules

### Debug Mode

```bash
LOG_LEVEL=debug node cli.js
```

### Health Checks

```bash
# Basic health
curl http://localhost:3000/health

# Detailed stats
curl http://localhost:3000/health | jq

# Metrics
curl http://localhost:3000/metrics
```

## Upgrading

### Zero-Downtime Upgrade

```bash
# 1. Deploy new version
docker pull aimds-quic:new-version

# 2. Rolling update
kubectl set image deployment/aimds-quic aimds-quic=aimds-quic:new-version

# 3. Monitor rollout
kubectl rollout status deployment/aimds-quic

# 4. Rollback if needed
kubectl rollout undo deployment/aimds-quic
```

## Support

For production support:
- Documentation: https://midstream.dev/docs
- Issues: https://github.com/midstream/midstream/issues
- Community: https://discord.gg/midstream
