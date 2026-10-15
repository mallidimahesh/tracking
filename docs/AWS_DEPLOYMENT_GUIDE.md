# AWS Production Deployment Guide
## VIT Shuttle — Smart Campus Transit System

This guide outlines the verified procedures to deploy the VIT Shuttle system onto Amazon Web Services (AWS) using either **AWS CloudFormation** (recommended) or manual setup.

---

## 1. Prerequisites Checklist

Before beginning deployment:
- [ ] AWS Account with active Free Tier access.
- [ ] AWS CLI installed and configured locally (`aws configure`) or access to AWS Management Console.
- [ ] An EC2 SSH Key Pair created in your chosen region (e.g. `us-east-1` or `ap-south-1`).
- [ ] Domain name or dynamic DNS (e.g., DuckDNS / Cloudflare) if deploying HTTPS for real mobile GPS permissions.

> [!IMPORTANT]
> **HTTPS Requirement for Mobile GPS:**
> Modern mobile browsers (Chrome on Android, Safari on iOS) strictly block the HTML5 Geolocation API on insecure `http://` connections outside of `localhost`. To track driver phone GPS in production, you must bind a domain and enable HTTPS (via free Let's Encrypt).

---

## 2. Method A: Automated CloudFormation Deployment (All 9 AWS Services)

The CloudFormation template at `aws/cloudformation.yaml` provisions:
1. **VPC** (Public & Private subnets across 2 AZs, IGW, Route Tables)
2. **EC2 App Server** (t2.micro / t3.micro Free Tier, Ubuntu 24.04 LTS, Nginx, Docker)
3. **RDS PostgreSQL** (db.t3.micro Free Tier) for user authentication & login
4. **DynamoDB** (`vitshuttle-telemetry-production`, PAY_PER_REQUEST Free Tier) for GPS & IoT streaming
5. **S3 Assets Bucket** for frontend static files and automated DB backups
6. **S3 TrailLogs Bucket** for security audit log persistence
7. **AWS CloudTrail** for management event audit trails
8. **CloudWatch** LogGroup, High CPU Alarm, and Real-Time Transit Dashboard
9. **AWS Budgets** ($1.00/month threshold) watchdog alert

### Step 1: Deploy CloudFormation Stack via AWS CLI
```bash
aws cloudformation deploy \
  --template-file aws/cloudformation.yaml \
  --stack-name vit-shuttle-prod \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      EnvironmentName=production \
      InstanceType=t2.micro \
      DBUsername=vitshuttle_admin \
      DBPassword="VitShuttle2026SecurePass!" \
      AlertEmail="transit-admin@vitstudent.ac.in"
```

*Alternatively: In the **AWS CloudFormation Console** in your open Chrome tab, click **Create stack** &rarr; **Upload a template file** &rarr; select `aws/cloudformation.yaml`.*

### Step 2: Retrieve Infrastructure Outputs
```bash
aws cloudformation describe-stacks \
  --stack-name vit-shuttle-prod \
  --query "Stacks[0].Outputs" --output table
```

---

## 3. Server Configuration & Application Deployment

### Step 1: SSH into the EC2 Instance
```bash
ssh -i /path/to/your-keypair.pem ubuntu@<INSTANCE_PUBLIC_IP>
```

### Step 2: Clone Repository onto Instance
```bash
sudo git clone https://github.com/mallidimahesh/tracking.git /opt/vit-shuttle
sudo chown -R ubuntu:ubuntu /opt/vit-shuttle
cd /opt/vit-shuttle
```

### Step 3: Populate Environment Configuration
```bash
cp .env.example .env
nano .env
```
Generate strong random secret keys:
```bash
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

### Step 4: Run the Automated Deployment Script
```bash
chmod +x aws/deploy_ec2.sh
./aws/deploy_ec2.sh
```

The script will:
1. Build the production React Vite frontend bundle.
2. Build the lightweight Flask-SocketIO Docker container.
3. Start Nginx and Gunicorn with Gevent persistent WebSocket workers.
4. Verify the backend health endpoint `http://127.0.0.1:5000/api/health`.

---

## 4. Configuring Free TLS / HTTPS with Certbot

To allow mobile drivers to share browser GPS:

1. Point your domain (e.g. `transit.yourdomain.com` or `vitshuttle.duckdns.org`) A-record to the EC2 Public IP.
2. Update `/opt/vit-shuttle/aws/nginx.conf` with your domain:
   ```nginx
   server_name transit.yourdomain.com;
   ```
3. Run Certbot:
   ```bash
   sudo certbot --nginx -d transit.yourdomain.com
   ```
4. Certbot automatically provisions a trusted SSL certificate and configures Nginx HTTPS redirects.

---

## 5. Verification & Health Checks

### Check Backend Health
```bash
curl -i http://localhost:5000/api/health
```
Expected response:
```json
{
  "environment": "production",
  "service": "vit-shuttle-backend",
  "status": "healthy",
  "version": "1.0.0"
}
```

### Check Fleet Seeding & Status
```bash
docker exec -it vitshuttle-backend-prod python manage.py list-shuttles
```

### Inspect Container Logs
```bash
# View live backend access and Socket.IO connection logs
docker compose -f /opt/vit-shuttle/aws/docker-compose.prod.yml logs -f backend

# View Nginx reverse proxy logs
docker compose -f /opt/vit-shuttle/aws/docker-compose.prod.yml logs -f nginx
```

---

## 6. Rollback Procedures

If an update fails:

1. **Rollback Container Version:**
   ```bash
   cd /opt/vit-shuttle/aws
   docker compose -f docker-compose.prod.yml down
   git checkout HEAD~1
   ./deploy_ec2.sh
   ```

2. **Restore Database from Snapshot:**
   ```bash
   chmod +x scripts/restore_db.sh
   ./scripts/restore_db.sh ~/backups/vit-shuttle/vit_shuttle_backup_YYYYMMDD_HHMMSS.sqlite.gz
   ```
