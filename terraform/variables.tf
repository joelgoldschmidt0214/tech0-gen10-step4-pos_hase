variable "resource_group_name" {
  type        = string
  description = "The name of the resource group."
  default     = "rg-secure-pos-app"
}

variable "location" {
  type        = string
  description = "The Azure region where resources will be deployed."
  default     = "japaneast"
}

variable "vnet_name" {
  type        = string
  description = "The name of the virtual network."
  default     = "vnet-secure-pos-app"
}