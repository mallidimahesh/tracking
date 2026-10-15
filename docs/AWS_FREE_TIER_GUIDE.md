# AWS Free Tier & Cost Eligibility Guide
## VIT Shuttle — Smart Campus Transit System

This guide provides an honest, transparent breakdown of AWS services, actual free tier eligibility, potential hidden charges, and cost mitigation strategies for deploying the VIT Shuttle platform.

---

## 1. Executive Summary & Cost Checklist

| AWS Resource | Proposed Service | AWS Free Tier Allowance | Estimated Monthly Cost | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Compute** | Amazon EC2 (`t2.micro` or `t3.micro`) | **750 hours/month** (12-Month Free Tier) | **$0.00** (Eligible accounts) | Run 1 instance continuously for 31 days (744 hrs). |
| **Public IPv4** | EC2 In-use Public IPv4 Address | *None* (AWS charges since Feb 2024) | **~$3.60 – $3.72 / month** | $0.005/hr for public IPv4. Can be minimized by stopping EC2 when not in use. |
| **Storage** | Amazon EBS GP3 Volume (20 GB) | **30 GB/month** (12-Month Free Tier) | **$0.00** | Stored outside disposable containers for SQLite persistence. |
| **Frontend CDN** | Amazon CloudFront | **1 TB Data Transfer Out/month** (Always Free) | **$0.00** | 10,000,000 HTTP/HTTPS requests/month free forever. |
| **Frontend Storage**| Amazon S3 (Static Website) | **5 GB Standard Storage** (12-Month Free Tier) | **$0.00** | 20,000 GET requests / 2,000 PUT requests free. |
| **Database** | SQLite on EBS | *Included in EBS storage* | **$0.00** | **Avoids Amazon RDS**, saving ~$15–$25/month. |
| **NAT Gateway** | *Excluded by Design* | *None* ($0.045/hr + data) | **$0.00 (Saved $32/mo)** | EC2 placed directly in Public Subnet with strict Security Group. |
| **Load Balancer** | *Excluded for Single EC2* | *None* ($0.0225/hr + LCU) | **$0.00 (Saved $18/mo)** | Nginx reverse proxy handles SSL and WebSocket upgrades on-host. |
| **Map Provider** | Leaflet + OpenStreetMap / Carto | Free / Open-Source | **$0.00** | Zero Google Maps API or paid Mapbox charges. |

> [!WARNING]
> **AWS Public IPv4 Address Charge (Important Budget Notice):**
> Effective February 1, 2024, AWS charges **$0.005 per hour** for all public IPv4 addresses, even on Free Tier eligible EC2 instances. This results in approximately **$3.65/month** if the instance runs 24/7.
> **Cost Mitigation:** Stop the EC2 instance via AWS Management Console or AWS CLI when not actively demonstrating or testing. Stopped instances do not incur IPv4 charges.

---

## 2. Service-by-Service Eligibility Analysis

### A. Amazon EC2 Compute (Flask-SocketIO Backend)
- **Eligibility:** 750 hours per month of `t2.micro` (or `t3.micro` in regions where `t2.micro` is unavailable) for the first 12 months after AWS account signup.
- **Persistent WebSockets:** EC2 supports long-lived, stateful TCP/WebSocket connections needed by Socket.IO without arbitrary timeout limits (unlike AWS Lambda or API Gateway HTTP APIs which drop after 29 seconds).
- **Region Recommendation:** Deploy in `us-east-1` (N. Virginia), `ap-south-1` (Mumbai), or `eu-central-1` (Frankfurt) where free tier compute instances are universally supported.

### B. Persistent Database Storage (SQLite on EBS)
- **Why SQLite over Amazon RDS?**
  - Amazon RDS Free Tier expires after 12 months, after which a `db.t3.micro` instance incurs ~$18–$28/month.
  - For an initial deployment of 6 campus shuttles handling 3–5 second GPS updates and IR sensor telemetry, SQLite on a persistent EBS volume handles thousands of writes per second with sub-millisecond local latency.
  - The SQLite database file resides on the mounted EBS volume (`/opt/vit-shuttle/data/vit_shuttle.db`), completely decoupled from container teardowns.
  - SQLAlchemy models are fully standard and can migrate to Amazon RDS PostgreSQL in Phase 2 with a single connection string change.

### C. Zero NAT Gateway Architecture
- A typical AWS VPC architecture places compute in private subnets behind a NAT Gateway. However, an AWS NAT Gateway costs **$0.045 per hour (~$32.40/month)** plus $0.045 per GB data processed, and is **NOT** included in the Free Tier.
- **Our Cost-Conscious Architecture:** The EC2 instance resides in a Public Subnet with an attached Internet Gateway ($0.00 cost). Security is enforced by an AWS Security Group restricting inbound access strictly to ports `80` (HTTP), `443` (HTTPS), and `22` (SSH from your IP).

---

## 3. Configuring AWS Cost Anomaly & Budget Alerts

To guarantee that your AWS account never incurs unexpected bills:

1. Sign in to the **AWS Management Console** and search for **AWS Budgets**.
2. Click **Create budget**.
3. Choose **Cost budget (Recommended)**.
4. Set Budget Details:
   - **Period:** Monthly
   - **Budget effective date:** Recurring
   - **Budgeted amount:** `$5.00` (or `$1.00` for strict warning)
5. Set Alert Thresholds:
   - Alert 1: Trigger when actual cost exceeds **50%** ($2.50).
   - Alert 2: Trigger when forecasted cost exceeds **100%** ($5.00).
6. Enter your personal notification email address.
7. Click **Create budget**.

> [!NOTE]
> AWS Budget alerts notify you via email when spending thresholds are breached, but **do not automatically shut down servers**. To completely stop charges, follow the instructions in [TEARDOWN_GUIDE.md](./TEARDOWN_GUIDE.md).
