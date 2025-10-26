# --- HTTP Data Source for Public IP ---
# 現在操作しているPCのグローバルIPアドレスを取得する
data "http" "my_public_ip" {
  url = "https://ifconfig.me/ip"
}

# --- Random String for Unique Names ---
resource "random_string" "unique" {
  length  = 8
  special = false
  upper   = false
}

# --- Azure Resources ---
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# --- Network Resources ---
resource "azurerm_virtual_network" "vnet" {
  name                = var.vnet_name
  # locationとresource_group_nameの参照先を変更
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]
}

# --- Subnets ---
resource "azurerm_subnet" "frontend" {
  name                 = "snet-frontend-integration"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]

  delegation {
    name = "appservice-delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "backend" {
  name                 = "snet-backend-integration"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "appservice-delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "private_endpoints" {
  name                                      = "snet-private-endpoints"
  resource_group_name                       = azurerm_resource_group.rg.name
  virtual_network_name                      = azurerm_virtual_network.vnet.name
  address_prefixes                          = ["10.0.3.0/24"]
}


# --- Network Security Groups (NSGs) ---
resource "azurerm_network_security_group" "nsg_backend" {
  name                = "nsg-backend"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "Allow_Frontend_to_Backend"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["80", "443"]
    source_address_prefix      = azurerm_subnet.frontend.address_prefixes[0]
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "nsg_backend_assoc" {
  subnet_id                 = azurerm_subnet.backend.id
  network_security_group_id = azurerm_network_security_group.nsg_backend.id
}

# --- Random Password for MySQL ---
resource "random_password" "mysql_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}


# --- Database Resources (MySQL Flexible Server) ---
resource "azurerm_mysql_flexible_server" "mysql" {
  name                   = "mysql-${var.resource_group_name}" # 一意な名前を生成
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  administrator_login    = var.mysql_admin_username
  administrator_password = random_password.mysql_password.result
  sku_name               = "B_Standard_B1s" # 開発用の最小SKU
  version                = "8.0.21"

  storage {
    size_gb = 32 # 32GB
  }

  # パブリックアクセスを無効化 (自動設定されるためコメントアウト)
  # public_network_access_enabled = false

}

# --- Key Vault Resources ---
# 現在操作しているユーザーの情報を取得（Key Vaultの権限付与に利用）
data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "kv" {
  name                        = "kv-pos-${random_string.unique.result}" # 一意な名前を生成
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"

  # パブリックアクセスを無効化
  # public_network_access_enabled = false

  # アクセス制御にRBACを利用
  enable_rbac_authorization = true

  network_acls {
    # デフォルトですべての通信を拒否
    default_action = "Deny"
    # Azure内部の信頼されたサービスからのアクセスは許可 (例: App Service)
    bypass         = "AzureServices"
    # 現在Terraformを実行しているIPアドレスからのアクセスを許可
    ip_rules       = [data.http.my_public_ip.response_body]
  }
}

# Key Vaultに自分自身（Terraform実行者）がシークレットを書き込める権限を付与
resource "azurerm_role_assignment" "kv_admin" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# DBの接続情報をKey Vaultのシークレットとして保存
resource "azurerm_key_vault_secret" "db_connection_string" {
  name         = "db-connection-string"
  key_vault_id = azurerm_key_vault.kv.id
  value        = "mysql+aiomysql://${azurerm_mysql_flexible_server.mysql.administrator_login}:${random_password.mysql_password.result}@${azurerm_mysql_flexible_server.mysql.fqdn}:3306/${var.mysql_database_name}"
  # Key Vaultへの権限割り当てが完了するまで、このリソースの作成を待機させる
  depends_on = [
    azurerm_role_assignment.kv_admin
  ]
}


# --- Private DNS and Endpoints ---
# 1. MySQL Private DNS Zone
resource "azurerm_private_dns_zone" "mysql" {
  name                = "privatelink.mysql.database.azure.com"
  resource_group_name = azurerm_resource_group.rg.name
}

# 2. Key Vault Private DNS Zone
resource "azurerm_private_dns_zone" "keyvault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = azurerm_resource_group.rg.name
}

# 3. Link DNS Zones to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "mysql_link" {
  name                  = "${var.vnet_name}-mysql-link"
  resource_group_name   = azurerm_resource_group.rg.name
  private_dns_zone_name = azurerm_private_dns_zone.mysql.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
}

resource "azurerm_private_dns_zone_virtual_network_link" "keyvault_link" {
  name                  = "${var.vnet_name}-keyvault-link"
  resource_group_name   = azurerm_resource_group.rg.name
  private_dns_zone_name = azurerm_private_dns_zone.keyvault.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
}

# 4. MySQL Private Endpoint
resource "azurerm_private_endpoint" "mysql" {
  name                = "pe-mysql"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "psc-mysql"
    private_connection_resource_id = azurerm_mysql_flexible_server.mysql.id
    is_manual_connection           = false
    subresource_names              = ["mysqlServer"]
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.mysql.id]
  }
}

# 5. Key Vault Private Endpoint
resource "azurerm_private_endpoint" "keyvault" {
  name                = "pe-keyvault"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "psc-keyvault"
    private_connection_resource_id = azurerm_key_vault.kv.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.keyvault.id]
  }
}

# --- Application Infrastructure (App Services) ---

# 1. App Service Plan (FrontendとBackendが同居するサーバー)
resource "azurerm_service_plan" "main" {
  name                = "asp-${var.resource_group_name}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "B1"
}

# 2. Frontend App Service (Next.js)
resource "azurerm_linux_web_app" "frontend" {
  name                = "app-frontend-${random_string.unique.result}" # グローバルにユニークな名前が必要
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_service_plan.main.location
  service_plan_id     = azurerm_service_plan.main.id

  # マネージドIDを有効化
  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      node_version = "22-lts"
    }
  }
}

# 3. Backend App Service (FastAPI)
resource "azurerm_linux_web_app" "backend" {
  name                = "app-backend-${random_string.unique.result}" # グローバルにユニークな名前が必要
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_service_plan.main.location
  service_plan_id     = azurerm_service_plan.main.id

  # マネージドIDを有効化
  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      python_version = "3.12"
    }
  }
}


# --- VNet Integration ---

# 4. Frontend App ServiceをVNetに接続
resource "azurerm_app_service_virtual_network_swift_connection" "frontend_vnet_integration" {
  app_service_id = azurerm_linux_web_app.frontend.id
  subnet_id      = azurerm_subnet.frontend.id
}

# 5. Backend App ServiceをVNetに接続
resource "azurerm_app_service_virtual_network_swift_connection" "backend_vnet_integration" {
  app_service_id = azurerm_linux_web_app.backend.id
  subnet_id      = azurerm_subnet.backend.id
}


# --- Managed Identity and Key Vault Access ---

# 6. Frontend App ServiceのIDにKey Vault読み取り権限を付与
resource "azurerm_role_assignment" "frontend_kv_reader" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User" # 読み取り専用の最小権限ロール
  principal_id         = azurerm_linux_web_app.frontend.identity[0].principal_id

  # App Serviceが作成されるのを待ってから権限を付与する
  depends_on = [
    azurerm_linux_web_app.frontend
  ]
}

# 7. Backend App ServiceのIDにKey Vault読み取り権限を付与
resource "azurerm_role_assignment" "backend_kv_reader" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id

  # App Serviceが作成されるのを待ってから権限を付与する
  depends_on = [
    azurerm_linux_web_app.backend
  ]
}