#!/bin/bash
set -e

# ==============================================================================
# VIT Shuttle Track - Automated AWS Serverless Deployment Script
# Region: ap-southeast-2 (Sydney) | Cost: $0 Idle / Free-Tier Optimized
# ==============================================================================

echo "🚀 [1/5] Checking environment..."
export AWS_DEFAULT_REGION="ap-southeast-2"
echo "Target AWS Region: $AWS_DEFAULT_REGION"

# Install Terraform if not present (e.g. fresh AWS CloudShell instance)
if ! command -v terraform &> /dev/null; then
    echo "📦 Terraform not found. Installing Terraform in CloudShell..."
    sudo yum install -y yum-utils
    sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
    sudo yum -y install terraform
fi

echo "📦 [2/5] Installing project dependencies..."
npm install

echo "🏗️ [3/5] Building frontend bundle..."
STATIC_EXPORT=true npm run build || true

echo "☁️ [4/5] Initializing & applying Terraform infrastructure..."
cd terraform
mkdir -p build
terraform init -upgrade
terraform apply -auto-approve -var="aws_region=ap-southeast-2"

S3_BUCKET=$(terraform output -raw s3_bucket_name)
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
API_URL=$(terraform output -raw api_gateway_url)

echo "📤 [5/5] Syncing frontend build to S3 bucket ($S3_BUCKET)..."
cd ..
if [ -d "out" ]; then
    aws s3 sync out/ "s3://$S3_BUCKET/" --delete --region ap-southeast-2
elif [ -d ".next" ]; then
    aws s3 sync .next/ "s3://$S3_BUCKET/.next/" --region ap-southeast-2
    aws s3 cp pages/ "s3://$S3_BUCKET/pages/" --recursive --region ap-southeast-2 || true
fi

echo ""
echo "======================================================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "🌐 CloudFront Live URL : $CLOUDFRONT_URL"
echo "⚡ API Gateway Endpoint : $API_URL"
echo "🛡️ AWS Region          : ap-southeast-2"
echo "🔒 Budget Guard        : \$10 threshold (Protects \$70 AWS Credits)"
echo "======================================================================"
