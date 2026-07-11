# .github/hooks/pre-push.ps1
# ═══════════════════════════════════════════════════════════════
# PRE-PUSH HOOK — Auto-update CHANGELOG.md before every push
# ═══════════════════════════════════════════════════════════════
#
# Cara install:
#   1. Copy file ini ke .git/hooks/pre-push
#      Copy-Item ".github\hooks\pre-push.ps1" ".git\hooks\pre-push"
#   2. Atau jalankan: .github\hooks\install.ps1
#
# Cara kerja:
#   - Membaca commit messages antara remote dan local branch
#   - Mengekstrak conventional commits (feat:, fix:, change:, remove:)
#   - Menambahkan entry baru di CHANGELOG.md
#   - Auto-commit update CHANGELOG jika ada perubahan baru
#   - Skip jika tidak ada perubahan yang perlu dicatat
# ═══════════════════════════════════════════════════════════════

param(
    [string]$remoteName,
    [string]$remoteUrl
)

# Baca input dari stdin (Git memberikan info ref yang di-push via stdin)
$input = [Console]::In.ReadToEnd().Trim()
if (-not $input) {
    # Fallback: baca semua commit yang belum di-push
    Write-Host ":: Pre-push hook: reading unpushed commits..."
    exit 0  # Jangan block push, CHANGELOG di-update via CI workflow
}

# ═══════════════════════════════════════════════════════════════
# MODE 1: LOCAL (akan dijalankan di laptop developer)
# Di mode ini, hook hanya warning — tidak auto-commit.
# Auto-commit CHANGELOG dilakukan oleh GitHub Actions CI.
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  📋 CHANGELOG CHECK                               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Cek apakah CHANGELOG.md sudah diupdate di commit terbaru
$changedFiles = git diff --name-only HEAD~1..HEAD 2>$null
if ($LASTEXITCODE -ne 0) {
    # First commit atau error — lanjutkan
    Write-Host "⚠️  Tidak bisa memeriksa diff (mungkin first commit)." -ForegroundColor Yellow
    Write-Host "   Pastikan CHANGELOG.md diupdate secara manual." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# Cari commit yang punya conventional commit prefix
$unpushedCommits = git log @{remoteName}/@{upstream}..HEAD --oneline --no-merges 2>$null
if ($LASTEXITCODE -ne 0) {
    # Branch baru — ambil semua commit
    $unpushedCommits = git log HEAD --oneline --no-merges --not --remotes
}

$hasFeatChange = $false
$commitsWithPrefix = @($unpushedCommits | Where-Object {
    $_ -match "^(feat|fix|change|remove|docs|chore)(\(.*?\))?:"
})

if ($commitsWithPrefix.Count -gt 0) {
    $hasFeatChange = $true
}

if ($changedFiles -match "CHANGELOG\.md") {
    Write-Host "✅ CHANGELOG.md sudah diupdate di commit ini." -ForegroundColor Green
    Write-Host ""
    exit 0
}

if ($hasFeatChange) {
    Write-Host "⚠️  Ditemukan commit dengan prefix conventional:" -ForegroundColor Yellow
    foreach ($c in $commitsWithPrefix) {
        Write-Host "   • $c" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "📝 CHANGELOG.md BELUM diupdate!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Rekomendasi:" -ForegroundColor White
    Write-Host "   1. Update CHANGELOG.md secara manual, ATAU" -ForegroundColor Gray
    Write-Host "   2. Push saja — GitHub Actions akan auto-update CHANGELOG" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Lanjutkan push? (y/n) " -ForegroundColor White -NoNewline
    $response = [Console]::ReadKey($true)
    Write-Host ""
    if ($response.KeyChar -ne 'y') {
        Write-Host "❌ Push dibatalkan. Update CHANGELOG.md dulu." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Push dilanjutkan. GitHub Actions akan update CHANGELOG." -ForegroundColor Green
} else {
    Write-Host "✅ Tidak ada conventional commit baru. CHANGELOG tidak perlu update." -ForegroundColor Green
}

Write-Host ""
exit 0
