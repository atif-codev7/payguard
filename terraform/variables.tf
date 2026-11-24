variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name identifier"
  type        = string
  default     = "payguard"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to deploy across"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "payguard"
}

variable "db_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "payguard_admin"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "backend_cpu" {
  description = "Fargate CPU units for backend (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "backend_memory" {
  description = "Fargate memory (MiB) for backend"
  type        = number
  default     = 2048
}

variable "frontend_cpu" {
  description = "Fargate CPU units for frontend"
  type        = number
  default     = 512
}

variable "frontend_memory" {
  description = "Fargate memory (MiB) for frontend"
  type        = number
  default     = 1024
}
