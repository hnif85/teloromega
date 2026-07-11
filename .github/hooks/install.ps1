# .github/hooks/install.ps1
# ═══════════════════════════════════════════════════════════════
# INSTALL GIT HOOKS — Copy hooks ke .git/hooks/
# ═══════════════════════════════════════════════════════════════
#
# Jalankan dari root project:
#   powershell -ExecutionPolicy Bypass -File .github\hooks\install.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$hooksDir = Join-Path $root ".git\hooks"
$sourceDir = Join-Path $root ".github\hooks"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔧 Install Git Hooks — usahaku.ai                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $hooksDir)) {
    Write-Host "❌ .git/hooks/ directory tidak ditemukan." -ForegroundColor Red
    Write-Host "   Pastikan kamu menjalankan script ini dari root repository." -ForegroundColor Red
    exit 1
}

Write-Host "📂 Source: $sourceDir" -ForegroundColor Gray
Write-Host "📂 Target: $hooksDir" -ForegroundColor Gray
Write-Host ""

# Install pre-push hook
$prePushSource = Join-Path $sourceDir "pre-push.ps1"
$prePushTarget = Join-Path $hooksDir "pre-push"

if (Test-Path $prePushSource) {
    # Buat wrapper bash script yang memanggil PowerShell
    $wrapper = @"
#!/bin/bash
# Git pre-push hook wrapper — calls PowerShell script
powershell.exe -ExecutionPolicy Bypass -File ".github/hooks/pre-push.ps1" -remoteName "`$1" -remoteUrl "`$2"
exit `$?
"@
    Set-Content -Path $prePushTarget -Value $wrapper -Encoding ASCII -NoNewline
    Write-Host "✅ pre-push hook terinstall." -ForegroundColor Green
} else {
    Write-Host "⚠️  pre-push.ps1 tidak ditemukan di $sourceDir" -ForegroundColor Yellow
}

# Set executable permission (Git Bash / WSL akan menghormati ini)
# Di Windows, Git Bash akan membaca shebang line

Write-Host ""
Write-Host "🎉 Semua hooks terinstall!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Hooks yang aktif:" -ForegroundColor White
Write-Host "   • pre-push  — Cek CHANGELOG.md sebelum push" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Setiap kali push, hook akan:" -ForegroundColor White
Write-Host "   1. Mengecek apakah ada conventional commit baru" -ForegroundColor Gray
Write-Host "   2. Warning jika CHANGELOG.md belum diupdate" -ForegroundColor Gray
Write-Host "   3. Memberi opsi lanjut push (CHANGELOG akan diupdate CI)" -ForegroundColor Gray
Write-Host ""
