param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$resolved=[System.IO.Path]::GetFullPath($OutputDirectory);New-Item -ItemType Directory -Path $resolved -Force|Out-Null
if(-not $env:DATABASE_URL){throw "DATABASE_URL tanımlı değil."};$stamp=Get-Date -Format "yyyyMMdd-HHmmss";$target=Join-Path $resolved "mdi-$stamp.dump"
& pg_dump --format=custom --no-owner --file=$target $env:DATABASE_URL;if($LASTEXITCODE-ne 0){throw "pg_dump başarısız."};Write-Output $target
