try {
    # 1. Login to get token
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType "application/json" -InFile "temp_login.json"
    $token = $loginResponse.token
    Write-Host "Login Successful. Token obtained."

    # 2. Call /api/auth/me
    $headers = @{ Authorization = "Bearer $token" }
    $meResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method Get -Headers $headers
    
    Write-Host "Auth Check Successful:"
    $meResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error:" $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        $reader.ReadToEnd()
    }
}
