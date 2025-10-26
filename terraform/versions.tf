terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.50.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7.0"
    }
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  resource_provider_registrations = "none"
  resource_providers_to_register = [
    "Microsoft.Resources",
    "Microsoft.Authorization",
    "Microsoft.CostManagement",
    "Microsoft.ManagedIdentity",
    "Microsoft.Network",
    "Microsoft.KeyVault",
    "Microsoft.DBforMySQL",
    "Microsoft.Web",
  ]
  features {}
}