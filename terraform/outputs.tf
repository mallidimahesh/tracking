output "aws_region" {
  description = "Deployed AWS Region"
  value       = var.aws_region
}

output "api_gateway_url" {
  description = "Direct API Gateway HTTP endpoint"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}

output "cloudfront_url" {
  description = "Live Production URL (Global Edge CDN)"
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "s3_bucket_name" {
  description = "S3 bucket hosting frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.pool.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.client.id
}

output "dynamodb_tables" {
  description = "DynamoDB serverless database tables"
  value = {
    users        = aws_dynamodb_table.users.name
    shuttles     = aws_dynamodb_table.shuttles.name
    transactions = aws_dynamodb_table.transactions.name
    alerts       = aws_dynamodb_table.alerts.name
    hotlist      = aws_dynamodb_table.hotlist.name
  }
}
