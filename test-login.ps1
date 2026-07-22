# Test invalid login
try {
    $resErr = Invoke-WebRequest -Uri 'http://localhost:3000/api/admin/login' -Method POST -Body '{"username":"wrong","password":"wrong"}' -ContentType 'application/json' -UseBasicParsing
    Write-Host "Unexpected success for wrong login" -ForegroundColor Red
} catch {
    Write-Host "Wrong login properly rejected with status: $($_.Exception.Response.StatusCode)" -ForegroundColor Green
}

# Test valid login
$resOk = Invoke-WebRequest -Uri 'http://localhost:3000/api/admin/login' -Method POST -Body '{"username":"PLNCOMUNICATION","password":"plncomunication2026"}' -ContentType 'application/json' -UseBasicParsing
$json = $resOk.Content | ConvertFrom-Json
Write-Host "Valid login status: $($resOk.StatusCode)" -ForegroundColor Green
Write-Host "Token received: $($json.token)" -ForegroundColor Cyan
