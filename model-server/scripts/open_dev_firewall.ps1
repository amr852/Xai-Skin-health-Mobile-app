# Opens inbound TCP for the Xai dev servers so a phone on the same LAN/hotspot can reach them.
# Idempotent: removes any prior rule of the same name first. Reverse with Remove-NetFirewallRule -DisplayName 'Xai Dev *'.
$rules = @(
    @{ Name = 'Xai Dev Node 3000';  Port = 3000 },
    @{ Name = 'Xai Dev Flask 5000'; Port = 5000 }
)
foreach ($r in $rules) {
    Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port -Profile Any | Out-Null
    Write-Host "Created: $($r.Name) (TCP $($r.Port))"
}
