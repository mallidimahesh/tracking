# AWS Resource Teardown & Cleanup Guide
## VIT Shuttle — Smart Campus Transit System

Follow this guide to stop or completely decommission all AWS resources when testing is finished, ensuring your account incurs **zero unexpected charges**.

---

## 1. Quick Stop (Temporarily Pause All Charges)

If you plan to resume testing later, you can stop the EC2 instance without deleting your data:

### Via AWS Management Console:
1. Open the **Amazon EC2 Console**.
2. Select your `vitshuttle-server-production` instance.
3. Click **Instance state** $\rightarrow$ **Stop instance**.

### Via AWS CLI:
```bash
aws ec2 stop-instances --instance-ids <YOUR_INSTANCE_ID>
```

> [!NOTE]
> When an EC2 instance is stopped:
> - EC2 compute charges drop to **$0.00**.
> - Public IPv4 hourly charges ($0.005/hr) **stop immediately**.
> - Only the 20 GB EBS storage volume remains, which is fully covered under the AWS 30 GB Free Tier allowance.

---

## 2. Complete Permanent Teardown (Decommission Everything)

### Step 1: Backup Database Locally (Optional)
Before deletion, download your transit SQLite database to your personal machine:
```bash
scp -i your-key.pem ubuntu@<INSTANCE_PUBLIC_IP>:/opt/vit-shuttle/data/vit_shuttle.db ./local_vit_shuttle_backup.db
```

### Step 2: Delete CloudFormation Stack (Automated Deletion)
If you deployed via CloudFormation:

```bash
aws cloudformation delete-stack --stack-name vit-shuttle-prod
```

Wait for deletion confirmation:
```bash
aws cloudformation wait stack-delete-complete --stack-name vit-shuttle-prod
echo "CloudFormation stack and all associated VPC/EC2 resources deleted successfully."
```

### Step 3: Manual Resource Checklist (If Deployed Manually)
Verify that each of the following resources is terminated:

1. **Amazon EC2 Instances:**
   - Go to EC2 Console $\rightarrow$ Instances.
   - Select `vitshuttle-server` $\rightarrow$ **Instance state** $\rightarrow$ **Terminate instance**.
2. **Amazon Elastic Block Store (EBS):**
   - Go to EC2 Console $\rightarrow$ Elastic Block Store $\rightarrow$ Volumes.
   - Verify that the volume attached to the terminated instance has been removed. If set to `DeleteOnTermination: false`, manually select the volume $\rightarrow$ **Actions** $\rightarrow$ **Delete volume**.
3. **Elastic IP Addresses (EIPs):**
   - Go to EC2 Console $\rightarrow$ Network & Security $\rightarrow$ Elastic IPs.
   - Any allocated but unassociated Elastic IP charges $0.005/hr. Select $\rightarrow$ **Actions** $\rightarrow$ **Release Elastic IP address**.
4. **Security Groups & VPC:**
   - Go to VPC Console $\rightarrow$ Security Groups $\rightarrow$ Delete `vitshuttle-sg`.
   - Delete VPC `vitshuttle-vpc` (this will automatically remove associated subnets and Internet Gateways).
5. **Amazon S3 & CloudFront (If static hosting was provisioned):**
   - Empty and delete the S3 frontend bucket.
   - Disable and delete the CloudFront distribution.

---

## 3. Verifying Zero Ongoing Charges

1. Navigate to **AWS Billing and Cost Management Dashboard** (`https://console.aws.amazon.com/billing/home`).
2. Check **Bills** $\rightarrow$ **Current month**.
3. Verify that active services show **$0.00** or only past usage charges.
4. Set up an AWS Budget for $1.00 as detailed in [AWS_FREE_TIER_GUIDE.md](./AWS_FREE_TIER_GUIDE.md) to catch any lingering orphaned resources.
