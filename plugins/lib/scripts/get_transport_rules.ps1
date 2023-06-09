param(
    [string]$AppId,
    [string]$CertificateThumbprint,
    [string]$Organization
)
Import-Module PowerShellGet 2> $null
Import-Module ExchangeOnlineManagement 2> $null

Connect-ExchangeOnline -AppId $AppId -CertificateThumbprint $CertificateThumbprint -Organization $Organization > $null
$VerbosePreference = "SilentlyContinue"

Get-TransportRule -Identity "WhiteList" | Select-Object -ExpandProperty SenderDomainIs | ConvertTo-Json

