# CBC Swift — Complete VPS Hosting Guide

**Stack:** Ubuntu 22.04 LTS · Docker · Nginx · PostgreSQL · Node.js 20  
**Estimated time:** 60–90 minutes for a clean setup

---

## Table of Contents
1. [VPS Requirements](#1-vps-requirements)
2. [Initial Server Setup](#2-initial-server-setup)
3. [Install Docker & Docker Compose](#3-install-docker--docker-compose)
4. [Configure Firewall](#4-configure-firewall)
5. [Upload the Project](#5-upload-the-project)
6. [Configure Environment Variables](#6-configure-environment-variables)
7. [Configure SendGrid (Email)](#7-configure-sendgrid-email)
8. [Configure M-Pesa (Daraja API)](#8-configure-m-pesa-daraja-api)
9. [Build & Start the System](#9-build--start-the-system)
10. [Configure a Domain Name (Optional)](#10-configure-a-domain-name-optional)
11. [Enable HTTPS with Let's Encrypt](#11-enable-https-with-lets-encrypt)
12. [Database Backups](#12-database-backups)
13. [Monitoring & Logs](#13-monitoring--logs)
14. [Maintenance Commands](#14-maintenance-commands)
15. [Troubleshooting](#15-troubleshooting)
16. [Default Login Credentials](#16-default-login-credentials)

---

## 1. VPS Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 1 vCPU  | 2 vCPU      |
| RAM      | 2 GB    | 4 GB        |
| Storage  | 20 GB SSD | 40 GB SSD |
| OS       | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Ports    | 22, 80, 443 | 22, 80, 443 |

**Recommended VPS providers:**
- [DigitalOcean](https://digitalocean.com) — $18/mo Droplet (2 vCPU, 4 GB)
- [Hetzner Cloud](https://hetzner.com) — €5/mo CX22 (2 vCPU, 4 GB) — best value
- [Vultr](https://vultr.com) — $18/mo (2 vCPU, 4 GB)
- [Linode / Akamai](https://linode.com) — $18/mo Shared 4 GB

---

## 2. Initial Server Setup

### 2.1 Connect to your VPS
```bash
# Replace YOUR_SERVER_IP with the IP from your VPS provider
ssh root@YOUR_SERVER_IP
```

### 2.2 Update the system
```bash
# Update package list and upgrade all installed packages
apt update && apt upgrade -y
```

### 2.3 Create a non-root user (security best practice)
```bash
# Create a user called 'cbcswift' (you can use any name)
adduser cbcswift

# Give it sudo privileges
usermod -aG sudo cbcswift

# Switch to the new user for remaining setup
su - cbcswift
```

### 2.4 Set up SSH key authentication (optional but recommended)
```bash
# On your LOCAL machine, generate an SSH key if you don't have one
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy the public key to the server
ssh-copy-id cbcswift@YOUR_SERVER_IP

# Test login (from your local machine)
ssh cbcswift@YOUR_SERVER_IP
```

---

## 3. Install Docker & Docker Compose

### 3.1 Install Docker
```bash
# Remove old Docker versions if any
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Install dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group (so you don't need sudo for docker)
sudo usermod -aG docker $USER

# Apply group change immediately
newgrp docker

# Verify installation
docker --version
docker compose version
```

Expected output:
```
Docker version 25.x.x
Docker Compose version v2.x.x
```

### 3.2 Enable Docker to start on boot
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. Configure Firewall

```bash
# Install ufw if not already installed
sudo apt install -y ufw

# Allow SSH (IMPORTANT: do this first or you'll lock yourself out)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable the firewall
sudo ufw enable

# Confirm rules are active
sudo ufw status
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## 5. Upload the Project

### Option A: Upload via SCP (from your local machine)
```bash
# On your LOCAL machine — upload the zip file to the server
scp CBCSWIFT_FIXED.zip cbcswift@YOUR_SERVER_IP:/home/cbcswift/

# Back on the server
ssh cbcswift@YOUR_SERVER_IP
cd ~
unzip CBCSWIFT_FIXED.zip
cd CBCSWIFT_FIXED
```

### Option B: Upload via Git (if you have a repository)
```bash
# On the server
git clone https://github.com/YOUR_USERNAME/cbcswift.git
cd cbcswift
```

### Option C: Use rsync (faster for large files)
```bash
# On your LOCAL machine
rsync -avz --progress CBCSWIFT_FIXED/ cbcswift@YOUR_SERVER_IP:/home/cbcswift/CBCSWIFT_FIXED/
```

---

## 6. Configure Environment Variables

```bash
# Navigate to the project directory
cd /home/cbcswift/CBCSWIFT_FIXED

# Edit the root .env file
nano .env
```

Fill in all the values:

```env
# Database
POSTGRES_DB=cbcnexus
POSTGRES_USER=cbcnexus
# IMPORTANT: Change this to a strong random password
POSTGRES_PASSWORD=YourStrongPasswordHere2025!

# JWT Secret — generate a strong random key
# Run: openssl rand -hex 32
JWT_SECRET=your-generated-64-char-hex-key-here

# Web origin — your domain or server IP
WEB_ORIGIN=http://YOUR_SERVER_IP
# If you have a domain: WEB_ORIGIN=https://yourdomain.com

# SendGrid (for emails)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=CBC Swift

# M-Pesa (leave empty for sandbox testing)
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_ENV=sandbox
MPESA_CALLBACK_URL=https://yourdomain.com/api/finance/mpesa/webhook
```

**Generate a strong JWT secret:**
```bash
# Run this command and copy the output into JWT_SECRET
openssl rand -hex 32
```

---

## 7. Configure SendGrid (Email)

### 7.1 Create a SendGrid account
1. Go to [sendgrid.com](https://sendgrid.com) and sign up (free tier: 100 emails/day)
2. Navigate to **Settings → API Keys**
3. Click **Create API Key**
4. Name it: `CBC Swift Production`
5. Permission: **Full Access** or **Mail Send only**
6. Click **Create & View** — copy the key immediately (shown only once)

### 7.2 Verify your sender email
1. In SendGrid, go to **Settings → Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter your from-email address (e.g., `noreply@yourdomain.com`)
4. Check that email address for the verification email and click confirm

### 7.3 Add to your .env
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=CBC Swift
```

### 7.4 Test email delivery
Once the system is running, you can test from inside the API container:
```bash
docker compose exec api node -e "
const fetch = require('node-fetch');
fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.SENDGRID_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: 'YOUR_TEST_EMAIL@gmail.com' }], subject: 'Test Email' }],
    from: { email: process.env.SENDGRID_FROM_EMAIL },
    content: [{ type: 'text/plain', value: 'CBC Swift email test works!' }]
  })
}).then(r => console.log('Status:', r.status))
"
```

---

## 8. Configure M-Pesa (Daraja API)

### 8.1 Create a Daraja developer account
1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Register and log in
3. Go to **My Apps → Create App**
4. Select **Lipa na M-Pesa Sandbox**
5. Copy your **Consumer Key** and **Consumer Secret**

### 8.2 Sandbox testing
```env
MPESA_ENV=sandbox
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CONSUMER_KEY=your-sandbox-consumer-key
MPESA_CONSUMER_SECRET=your-sandbox-consumer-secret
```

**Test phone number for sandbox:** `254708374149`

### 8.3 Go live (production)
1. In Daraja portal, submit your app for review
2. Once approved, update:
```env
MPESA_ENV=production
MPESA_SHORTCODE=your-real-paybill
MPESA_PASSKEY=your-real-passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/finance/mpesa/webhook
```

---

## 9. Build & Start the System

```bash
# Navigate to project directory
cd /home/cbcswift/CBCSWIFT_FIXED

# Build all Docker images (this takes 5-10 minutes the first time)
docker compose build

# Start all services in the background
docker compose up -d

# Watch the logs to make sure everything starts correctly
docker compose logs -f
```

**You should see (within 1-2 minutes):**
```
api      | >>> Running Prisma migrations...
api      | >>> Running seed (idempotent)...
api      | >>> Starting CBCNexus API...
api      | CBCNexus API running on port 4000
web      | Ready - started server on 0.0.0.0:3000
nginx    | /docker-entrypoint.sh: Configuration complete; ready for start up
```

### 9.1 Verify all containers are running
```bash
docker compose ps
```

Expected output:
```
NAME              STATUS          PORTS
cbcswift-nginx    Up              0.0.0.0:80->80/tcp
cbcswift-web      Up              3000/tcp
cbcswift-api      Up              4000/tcp
cbcswift-postgres Up (healthy)    5432/tcp
cbcswift-redis    Up (healthy)    6379/tcp
```

### 9.2 Verify the API health check
```bash
curl http://localhost/api/health
# Expected: {"status":"ok","..."}
```

### 9.3 Open in browser
Navigate to `http://YOUR_SERVER_IP` — the CBC Swift landing page should load.

---

## 10. Configure a Domain Name (Optional)

### 10.1 Add an A record in your DNS provider
Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.) and add:

```
Type  Name    Value              TTL
A     @       YOUR_SERVER_IP     300
A     www     YOUR_SERVER_IP     300
```

Wait 5-30 minutes for DNS propagation.

### 10.2 Test DNS propagation
```bash
# Run from any computer
dig yourdomain.com +short
# Should return your server IP
```

---

## 11. Enable HTTPS with Let's Encrypt

### 11.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 11.2 Stop nginx container temporarily
```bash
docker compose stop nginx
```

### 11.3 Obtain SSL certificate
```bash
# Replace yourdomain.com with your actual domain
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com \
  --non-interactive --agree-tos --email your@email.com
```

Certificates will be saved to: `/etc/letsencrypt/live/yourdomain.com/`

### 11.4 Update nginx.conf for HTTPS
```bash
nano /home/cbcswift/CBCSWIFT_FIXED/nginx/conf.d/cbcnexus.conf
```

Replace the contents with:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Socket.IO WebSocket
    location /socket.io/ {
        proxy_pass http://api:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
    }

    # API
    location /api/ {
        proxy_pass http://api:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Static files
    location /_next/static/ {
        proxy_pass http://web:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Frontend
    location / {
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 11.5 Update docker-compose.yml to mount SSL certificates

Add these volumes to the nginx service in docker-compose.yml:
```yaml
  nginx:
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    ports:
      - "80:80"
      - "443:443"
```

### 11.6 Update .env with HTTPS origin
```bash
nano .env
# Update:
WEB_ORIGIN=https://yourdomain.com
MPESA_CALLBACK_URL=https://yourdomain.com/api/finance/mpesa/webhook
```

### 11.7 Restart everything
```bash
docker compose down
docker compose up -d
```

### 11.8 Auto-renew SSL certificates
```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for automatic renewal (runs at 2:30 AM daily)
echo "30 2 * * * root certbot renew --quiet && docker compose -f /home/cbcswift/CBCSWIFT_FIXED/docker-compose.yml restart nginx" | \
  sudo tee /etc/cron.d/certbot-renew
```

---

## 12. Database Backups

### 12.1 Manual backup
```bash
# Create backup directory
mkdir -p ~/backups

# Backup the database
docker compose exec -T postgres pg_dump \
  -U cbcnexus cbcnexus | gzip > ~/backups/cbcnexus_$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup
ls -lh ~/backups/
```

### 12.2 Automated daily backups
```bash
# Create backup script
cat > ~/backup-db.sh << 'BASH'
#!/bin/bash
BACKUP_DIR="/home/cbcswift/backups"
PROJECT_DIR="/home/cbcswift/CBCSWIFT_FIXED"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Create backup
cd "$PROJECT_DIR"
docker compose exec -T postgres pg_dump -U cbcnexus cbcnexus | \
  gzip > "$BACKUP_DIR/cbcnexus_$DATE.sql.gz"

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: cbcnexus_$DATE.sql.gz"
BASH

chmod +x ~/backup-db.sh

# Schedule daily at 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * * /home/cbcswift/backup-db.sh >> /home/cbcswift/backup.log 2>&1") | crontab -
```

### 12.3 Restore from backup
```bash
# Stop the API to prevent writes during restore
docker compose stop api

# Restore (replace the filename with your backup)
gunzip -c ~/backups/cbcnexus_20250601_030000.sql.gz | \
  docker compose exec -T postgres psql -U cbcnexus cbcnexus

# Restart API
docker compose start api
```

---

## 13. Monitoring & Logs

### 13.1 View real-time logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f nginx
docker compose logs -f postgres
```

### 13.2 Check resource usage
```bash
# Container CPU/RAM usage
docker stats

# Disk usage
df -h
du -sh ~/CBCSWIFT_FIXED/
```

### 13.3 Check container health
```bash
docker compose ps
docker compose exec api wget -qO- http://localhost:4000/health
```

### 13.4 Set up log rotation
```bash
sudo nano /etc/logrotate.d/docker

# Add:
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## 14. Maintenance Commands

### Update the application
```bash
cd /home/cbcswift/CBCSWIFT_FIXED

# Stop, rebuild, and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# Watch logs
docker compose logs -f
```

### Run database migrations manually
```bash
docker compose exec api npx prisma migrate deploy
```

### Re-run seed data
```bash
docker compose exec api npx tsx prisma/seed.ts
```

### Access the database directly
```bash
docker compose exec postgres psql -U cbcnexus cbcnexus
```

### Clear Redis cache
```bash
docker compose exec redis redis-cli FLUSHALL
```

### Restart a specific service
```bash
docker compose restart api
docker compose restart web
docker compose restart nginx
```

### Complete system restart
```bash
docker compose down && docker compose up -d
```

---

## 15. Troubleshooting

### API won't start — "database connection error"
```bash
# Check if PostgreSQL is healthy
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Verify DATABASE_URL in .env is correct
grep DATABASE_URL .env
```

### Web app shows blank page
```bash
# Check Next.js logs
docker compose logs web

# Common fix: rebuild with no cache
docker compose build --no-cache web
docker compose up -d web
```

### nginx shows 502 Bad Gateway
```bash
# API might not be ready yet — wait 30 seconds then check
docker compose logs api

# Check if API is listening
docker compose exec nginx curl -s http://api:4000/health
```

### Can't receive M-Pesa webhooks
```bash
# Your MPESA_CALLBACK_URL must be publicly accessible HTTPS
# For sandbox testing, use ngrok:
docker run -it --rm --network host ngrok/ngrok http 80

# Use the ngrok URL as your callback URL in M-Pesa settings
```

### Ports 80/443 already in use
```bash
# Find what's using port 80
sudo lsof -i :80
sudo systemctl stop apache2 nginx 2>/dev/null
```

### Out of disk space
```bash
# Remove unused Docker images and containers
docker system prune -a --volumes

# Check which directory is largest
du -sh /var/lib/docker/*
```

---

## 16. Default Login Credentials

Once the system is running, use these credentials to log in at `http://YOUR_SERVER_IP/login`:

| Role | Email | Password | Subdomain |
|------|-------|----------|-----------|
| **HQ Admin** | `admin@techswifttrix.com` | `Admin@2025!` | *(HQ Login)* |
| **School Admin** | `admin@greenvalley.ac.ke` | `School@2025!` | `greenvalley` |
| **Principal** | `principal@greenvalley.ac.ke` | `Principal@2025!` | `greenvalley` |
| **Teacher** | `teacher1@greenvalley.ac.ke` | `Teacher@2025!` | `greenvalley` |
| **Student** | `adm001@greenvalley.ac.ke` | `Student@2025!` | `greenvalley` |
| **Parent** | `parent1@greenvalley.ac.ke` | `Parent@2025!` | `greenvalley` |
| **Finance Officer** | `finance@greenvalley.ac.ke` | `Finance@2025!` | `greenvalley` |

> ⚠️ **IMPORTANT:** Change all default passwords immediately after your first login in production!

---

## Architecture Summary

```
Internet
    │
    ▼
  Nginx (Port 80/443)
    │
    ├─── /api/*  ──────► Express API (Port 4000)
    │                         │
    │                         ├── PostgreSQL
    │                         └── Redis
    │
    └─── /*      ──────► Next.js Frontend (Port 3000)
```

**Services:**
- **nginx** — Reverse proxy, SSL termination, static file caching
- **web** — Next.js 14 App Router (Server-Side Rendered)
- **api** — Express + Prisma ORM + Socket.IO real-time chat
- **postgres** — PostgreSQL 16 + pgvector
- **redis** — Session cache + real-time pub/sub

---

*CBC Swift — Africa's AI School Operating System*  
*Built by TechSwiftTrix*
