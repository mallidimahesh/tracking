# ------------------------------------------------------------------------------
# AWS Lambda Backend - Free Tier Safe (128MB, 1M free requests/mo)
# ------------------------------------------------------------------------------

data "archive_file" "backend_zip" {
  type        = "zip"
  source_file = "${path.module}/../backend_lambda/index.js"
  output_path = "/tmp/backend_lambda.zip"
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-exec-${random_string.suffix.result}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for DynamoDB Access and CloudWatch Logs
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          "${aws_dynamodb_table.users.arn}/*",
          aws_dynamodb_table.shuttles.arn,
          "${aws_dynamodb_table.shuttles.arn}/*",
          aws_dynamodb_table.transactions.arn,
          "${aws_dynamodb_table.transactions.arn}/*",
          aws_dynamodb_table.alerts.arn,
          "${aws_dynamodb_table.alerts.arn}/*",
          aws_dynamodb_table.hotlist.arn,
          "${aws_dynamodb_table.hotlist.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# CloudWatch Log Group with short retention (3 days) to protect $70 credits
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-api"
  retention_in_days = 3
}

# Lambda Function
resource "aws_lambda_function" "api" {
  filename         = data.archive_file.backend_zip.output_path
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 15
  memory_size      = 128
  source_code_hash = data.archive_file.backend_zip.output_base64sha256

  environment {
    variables = {
      USERS_TABLE        = aws_dynamodb_table.users.name
      SHUTTLES_TABLE     = aws_dynamodb_table.shuttles.name
      TRANSACTIONS_TABLE = aws_dynamodb_table.transactions.name
      ALERTS_TABLE       = aws_dynamodb_table.alerts.name
      HOTLIST_TABLE      = aws_dynamodb_table.hotlist.name
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_iam_role_policy.lambda_policy
  ]
}
