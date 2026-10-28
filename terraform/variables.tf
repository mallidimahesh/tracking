variable "aws_region" {
  description = "AWS Region to deploy resources into (tuned for user's CloudShell session)"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project identifier for naming resources"
  type        = string
  default     = "vit-shuttle-track"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "budget_limit_usd" {
  description = "Maximum budget limit in USD to monitor $70 credit safety"
  type        = number
  default     = 10
}

variable "notification_email" {
  description = "Email address for AWS Budget alerts"
  type        = string
  default     = "admin@campus.shuttle"
}
