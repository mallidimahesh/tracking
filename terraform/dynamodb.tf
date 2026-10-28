# ------------------------------------------------------------------------------
# Amazon DynamoDB - Free Tier Safe (On-Demand / $0 Idle Cost)
# ------------------------------------------------------------------------------

# 1. Users Table (Admin, Drivers, Students, Wallets)
resource "aws_dynamodb_table" "users" {
  name         = "vit_shuttle_users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "regNo"
    type = "S"
  }

  global_secondary_index {
    name            = "regNo-index"
    hash_key        = "regNo"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = false
  }
}

# 2. Shuttles Table (Real-time GPS positions & heading)
resource "aws_dynamodb_table" "shuttles" {
  name         = "vit_shuttle_shuttles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = false
  }
}

# 3. Transactions Table (NFC tap charges & refunds)
resource "aws_dynamodb_table" "transactions" {
  name         = "vit_shuttle_transactions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = false
  }
}

# 4. Alerts Table (Broadcast notifications)
resource "aws_dynamodb_table" "alerts" {
  name         = "vit_shuttle_alerts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = false
  }
}

# 5. Hotlist Table (Temporary NFC card cooldown with native TTL)
resource "aws_dynamodb_table" "hotlist" {
  name         = "vit_shuttle_hotlist"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cardUid"

  attribute {
    name = "cardUid"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false
  }
}
