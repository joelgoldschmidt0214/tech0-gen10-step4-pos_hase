variable "subscription_id" {
  type        = string
  description = "The ID of the subscription."
  default     = "35764fe2-0998-4a2f-b36a-a9f45312daef"
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group."
  default     = "rg-secure-pos-app"
}

variable "location" {
  type        = string
  description = "The Azure region where resources will be deployed."
  default     = "westus2"
}

variable "vnet_name" {
  type        = string
  description = "The name of the virtual network."
  default     = "vnet-secure-pos-app"
}

variable "mysql_admin_username" {
  type        = string
  description = "The administrator username for the MySQL server."
  default     = "dbadmin_pos"
}

variable "mysql_database_name" {
  type        = string
  description = "The name of the MySQL database to be created."
  default     = "step4-pos_hase" # アプリケーション用のDB名
}