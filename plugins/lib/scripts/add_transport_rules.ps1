param(
    [string]$AppId,
    [string]$CertificateThumbprint,
    [string]$Organization,
    [string]$updatedDomainList
)

Import-Module PowerShellGet 2> $null
Import-Module ExchangeOnlineManagement 2> $null

Connect-ExchangeOnline -AppId $AppId -CertificateThumbprint $CertificateThumbprint -Organization $Organization > $null
$VerbosePreference = "Continue"

Write-Verbose "Updated Domain List: $updatedDomainList"

try {
    # Convert the comma-separated string to an array
    $updatedDomainArray = $updatedDomainList -split ","

    # Set the modified list of sender domains for the transport rule
    Set-TransportRule -Identity "WhiteList" -SenderDomainIs $updatedDomainArray
} catch {
    Write-Verbose "Error: $_"
    throw $_
}
