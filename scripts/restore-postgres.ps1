param([Parameter(Mandatory=$true)][string]$BackupFile)
$resolved=[System.IO.Path]::GetFullPath($BackupFile);if(-not(Test-Path -LiteralPath $resolved -PathType Leaf)){throw "Yedek bulunamadı."};if(-not $env:DATABASE_URL){throw "DATABASE_URL tanımlı değil."}
& pg_restore --clean --if-exists --no-owner --dbname=$env:DATABASE_URL $resolved;if($LASTEXITCODE-ne 0){throw "pg_restore başarısız."};Write-Output "Geri yükleme tamamlandı: $resolved"
