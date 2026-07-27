$ErrorActionPreference = 'Continue'

$base = "http://localhost:3001"

$roles = @(
  "super_admin",
  "insurer_admin",
  "head_office_ops",
  "risk_manager",
  "compliance_aml",
  "legal_ops",
  "complaints_handler",
  "branch_manager",
  "branch_staff",
  "claims_handler",
  "loss_adjuster",
  "fraud_analyst",
  "underwriter",
  "finance_ops",
  "collections_ops",
  "reinsurance_ops",
  "agency_owner",
  "agency_staff",
  "broker_owner",
  "broker_staff",
  "call_center",
  "auditor",
  "regulatory_view"
)

foreach ($r in $roles) {
  $username = "test_$r"
  $payloadObj = @{
    email     = "$username@insurance.local"
    username  = $username
    password  = "Test12345!"
    firstName = "Test"
    lastName  = $r
    roles     = @($r)
  }

  $payload = $payloadObj | ConvertTo-Json -Depth 5

  try {
    $res = Invoke-RestMethod -Method Post -Uri "$base/register" -ContentType "application/json" -Body $payload

    if ($res.success -eq $true) {
      Write-Output "CREATED: $r => userId=$($res.data.userId) username=$($res.data.username)"
    } else {
      Write-Output "FAILED: $r => $($res.error.code) $($res.error.message)"
    }
  } catch {
    Write-Output "ERROR: $r => $($_.Exception.Message)"
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      Write-Output $_.ErrorDetails.Message
    }
  }
}
