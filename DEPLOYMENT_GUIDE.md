# Tela ERP: Comprehensive Deployment Guide

**Version:** 1.0.0  
**Last Updated:** April 6, 2026

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Requirements](#system-requirements)
3. [Installation Methods](#installation-methods)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Security Hardening](#security-hardening)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/olomierik/tela-erp.git
cd tela-erp

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:5000
# pgAdmin: http://localhost:5050
```

### Option 2: Manual Installation

```bash
# Install Node.js 22+
# https://nodejs.org/

# Clone repository
git clone https://github.com/olomierik/tela-erp.git
cd tela-erp

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
nano .env

# Build the application
npm run build

# Start the application
npm start
```

### Option 3: Windows Installer

1. Download `TelaERP-Setup.exe` from releases
2. Run the installer
3. Follow the installation wizard
4. Application will be installed to `C:\Program Files\TelaERP`
5. Launch from Start Menu

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
| :--- | :--- |
| **CPU** | 2 cores @ 2.0 GHz |
| **RAM** | 4 GB |
| **Storage** | 10 GB SSD |
| **OS** | Windows 10+, macOS 10.15+, Ubuntu 20.04+ |
| **Node.js** | 22.0.0+ |
| **PostgreSQL** | 14+ |

### Recommended Requirements

| Component | Recommendation |
| :--- | :--- |
| **CPU** | 4+ cores @ 2.5 GHz |
| **RAM** | 16 GB |
| **Storage** | 50 GB SSD |
| **Database** | PostgreSQL 16 with replication |
| **Backup** | Automated daily backups |

---

## Installation Methods

### Method 1: Docker Compose (Production)

#### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

#### Steps

```bash
# 1. Clone repository
git clone https://github.com/olomierik/tela-erp.git
cd tela-erp

# 2. Configure environment
cp .env.example .env
# Edit .env with production values

# 3. Create required directories
mkdir -p offline-server/data
mkdir -p logs

# 4. Start services
docker-compose up -d

# 5. Verify services
docker-compose ps

# 6. View logs
docker-compose logs -f app
```

#### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: data loss)
docker-compose down -v
```

### Method 2: Linux/macOS Manual Installation

#### Prerequisites
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx (optional, for reverse proxy)
sudo apt-get install -y nginx
```

#### Installation Steps

```bash
# 1. Create application directory
sudo mkdir -p /opt/tela-erp
cd /opt/tela-erp

# 2. Clone repository
sudo git clone https://github.com/olomierik/tela-erp.git .

# 3. Install dependencies
sudo npm install --production

# 4. Build application
sudo npm run build

# 5. Create service user
sudo useradd -r -s /bin/bash tela-erp

# 6. Set permissions
sudo chown -R tela-erp:tela-erp /opt/tela-erp

# 7. Create systemd service
sudo tee /etc/systemd/system/tela-erp.service > /dev/null <<EOF
[Unit]
Description=Tela ERP Application
After=network.target postgresql.service

[Service]
Type=simple
User=tela-erp
WorkingDirectory=/opt/tela-erp
ExecStart=/usr/bin/node offline-server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 8. Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable tela-erp
sudo systemctl start tela-erp

# 9. Check status
sudo systemctl status tela-erp
```

### Method 3: Windows Installation

#### Prerequisites
- Windows 10 or later
- Administrator privileges

#### Steps

1. Download `TelaERP-Setup.exe`
2. Right-click and select "Run as Administrator"
3. Accept the license agreement
4. Choose installation directory (default: `C:\Program Files\TelaERP`)
5. Click "Install"
6. Launch from Start Menu or desktop shortcut

#### Post-Installation

```cmd
# Open Command Prompt as Administrator
cd "C:\Program Files\TelaERP"

# Configure environment
copy .env.example .env
notepad .env

# Start the application
start_offline.bat
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Application
NODE_ENV=production
VITE_APP_NAME=Tela ERP

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=tela_user
DB_PASSWORD=secure_password_here
DB_NAME=tela_erp

# Supabase (if using cloud)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API
VITE_API_URL=http://localhost:5000
VITE_API_TIMEOUT=30000

# Security
VITE_JWT_SECRET=your-secret-key-min-32-chars
VITE_ENCRYPTION_KEY=your-encryption-key

# Features
VITE_ENABLE_AI_CFO=true
VITE_ENABLE_MOBILE_MONEY=true
VITE_ENABLE_OFFLINE_MODE=true
```

### Nginx Reverse Proxy Configuration

```nginx
upstream tela_erp {
    server localhost:3000;
}

upstream tela_api {
    server localhost:5000;
}

server {
    listen 80;
    server_name tela-erp.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tela-erp.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/tela-erp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tela-erp.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://tela_erp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://tela_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Database Setup

### PostgreSQL Initialization

```bash
# Create database user
sudo -u postgres createuser tela_user -P

# Create database
sudo -u postgres createdb -O tela_user tela_erp

# Run migrations
psql -U tela_user -d tela_erp -f supabase/migrations/*.sql
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/var/backups/tela-erp"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U tela_user tela_erp | gzip > $BACKUP_DIR/tela_erp_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/tela_erp_$TIMESTAMP.sql.gz"
```

Add to crontab:
```bash
0 2 * * * /usr/local/bin/backup-tela-erp.sh
```

---

## Security Hardening

### 1. SSL/TLS Configuration

```bash
# Install Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d tela-erp.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 2. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Database Security

```bash
# Restrict database access
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Add line:
# host    tela_erp    tela_user    127.0.0.1/32    md5
```

### 4. Application Security

- Change default passwords immediately
- Enable two-factor authentication
- Implement rate limiting
- Use strong JWT secrets
- Enable audit logging

---

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_inventory_product ON inventory_stock(product_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM sales_orders WHERE customer_id = 1;
```

### 2. Application Caching

```bash
# Enable Redis caching (optional)
docker run -d -p 6379:6379 redis:latest
```

### 3. CDN Configuration

- Use CloudFront or Cloudflare for static assets
- Enable gzip compression
- Minify CSS and JavaScript

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check application status
curl http://localhost:3000/health

# Check API status
curl http://localhost:5000/health

# Check database
psql -U tela_user -d tela_erp -c "SELECT 1;"
```

### Log Monitoring

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres

# System logs
sudo journalctl -u tela-erp -f
```

### Updates & Patches

```bash
# Update application
cd /opt/tela-erp
git pull origin main
npm install
npm run build
sudo systemctl restart tela-erp

# Update dependencies
npm update
npm audit fix
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
| :--- | :--- |
| Port already in use | Change port in `.env` or kill process: `lsof -i :3000` |
| Database connection failed | Check DB credentials and ensure PostgreSQL is running |
| High memory usage | Increase heap size: `NODE_OPTIONS="--max-old-space-size=4096"` |
| Slow performance | Enable caching, optimize queries, check indexes |
| SSL certificate error | Renew certificate: `sudo certbot renew` |

### Debug Mode

```bash
# Enable debug logging
export DEBUG=tela-erp:*
npm start
```

---

## Support & Resources

- **Documentation:** https://docs.tela-erp.com
- **GitHub Issues:** https://github.com/olomierik/tela-erp/issues
- **Community Forum:** https://community.tela-erp.com
- **Email Support:** support@tela-erp.com

---

*For questions or issues, please refer to the troubleshooting section or contact support.*
