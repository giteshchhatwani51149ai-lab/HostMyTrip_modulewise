## Run this script as Administrator in PowerShell
## It enables TCP/IP for SQL Server 2022 and restarts the service

# Step 1: Enable TCP/IP via registry
Write-Host "Enabling TCP/IP for SQL Server..." -ForegroundColor Cyan

$sqlKey = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp"
Set-ItemProperty -Path $sqlKey -Name "Enabled" -Value 1 -Type DWord
Write-Host "TCP/IP registry key updated." -ForegroundColor Green

# Step 2: Set TCP port to 1433 on all IPs
$ipAllKey = "$sqlKey\IPAll"
if (Test-Path $ipAllKey) {
    Set-ItemProperty -Path $ipAllKey -Name "TcpPort" -Value "1433"
    Set-ItemProperty -Path $ipAllKey -Name "TcpDynamicPorts" -Value ""
    Write-Host "TCP Port set to 1433." -ForegroundColor Green
}

# Step 3: Restart SQL Server
Write-Host "Restarting SQL Server service..." -ForegroundColor Cyan
Restart-Service -Name "MSSQLSERVER" -Force
Start-Sleep -Seconds 5

# Step 4: Verify
$status = Get-Service -Name "MSSQLSERVER"
Write-Host "SQL Server Status: $($status.Status)" -ForegroundColor $(if ($status.Status -eq 'Running') { 'Green' } else { 'Red' })

# Step 5: Test port
$tcpTest = Test-NetConnection -ComputerName localhost -Port 1433 -WarningAction SilentlyContinue
Write-Host "Port 1433 open: $($tcpTest.TcpTestSucceeded)" -ForegroundColor $(if ($tcpTest.TcpTestSucceeded) { 'Green' } else { 'Red' })

if ($tcpTest.TcpTestSucceeded) {
    Write-Host "`n✅ SQL Server TCP/IP is now enabled! You can run: npm run seed" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Port still not open. Please manually enable TCP/IP in SQL Server Configuration Manager." -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"
