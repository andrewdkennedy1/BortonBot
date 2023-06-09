$ErrorActionPreference = "Stop"

# Install PackageManagement if not already installed
if (-not (Get-Module -Name PackageManagement -ListAvailable)) {
    Install-PackageProvider -Name NuGet -Force
}

# Install PowerShellGet if not already installed
if (-not (Get-Module -Name PowerShellGet -ListAvailable)) {
    Install-Module -Name PowerShellGet -Force
}

# Set the TLS version to 1.2 to ensure secure communication with the PowerShell Gallery
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Install ExchangeOnlineManagement module
Install-Module -Name ExchangeOnlineManagement -Force -Scope CurrentUser

# Import ExchangeOnlineManagement module
Import-Module -Name ExchangeOnlineManagement -ErrorAction Stop
