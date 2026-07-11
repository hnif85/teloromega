# 📋 CHANGELOG Auto-Update — Panduan Developer

## Cara Kerja

Setiap kali kamu **push ke `main`/`master` branch**, GitHub Actions akan otomatis:

1. 🔍 **Membaca commit messages** sejak tag terakhir
2. 📊 **Mengkategorikan** berdasarkan conventional commit prefix
3. 📝 **Menambahkan entry baru** di `CHANGELOG.md`
4. 🏷️ **Membuat git tag** dengan version bump otomatis
5. 📤 **Auto-commit + push** update CHANGELOG

## Commit Convention

Gunakan prefix berikut di commit message agar otomatis masuk CHANGELOG:

| Prefix | Kategori di CHANGELOG | Version Bump |
|--------|----------------------|-------------|
| `feat:` atau `feat(scope):` | ✨ Added | **minor** |
| `fix:` | 🐛 Fixed | patch |
| `change:` | 🔧 Changed | patch |
| `remove:` | 🗑️ Removed | patch |
| `docs:` | 📝 Documentation | patch |
| `chore:` | 🛠 Maintenance | patch |
| `perf:` | ⚡ Performance | patch |
| `refactor:` | ♻️ Refactored | patch |
| `test:` | ✅ Tests | patch |
| `style:` | 💄 Style | patch |

### Contoh Commit Messages

```bash
# ✅ Benar — masuk CHANGELOG
git commit -m "feat: tambah fitur export PDF"
git commit -m "fix: perbaiki bug 401 setelah logout"
git commit -m "change: pindahkan brand selector ke topbar"
git commit -m "docs: update ARCHITECTURE.md dengan AI patterns"

# ❌ Salah — TIDAK masuk CHANGELOG (tanpa conventional prefix)
git commit -m "update beberapa file"
git commit -m "perbaikan kecil"
git commit -m "wip: lagi nyoba sesuatu"  # WIP commit, jangan push ke main
```

## Version Bump Logic

| Jika ada commit... | Version bump | Contoh |
|-------------------|-------------|--------|
| `feat:` | **minor** | v0.2.0 → v0.3.0 |
| Hanya `fix:`/`change:`/dll | **patch** | v0.2.0 → v0.2.1 |
| Tidak ada conventional commit | **skip** | Tidak update |

### Manual Version Bump

Jika ingin bump versi secara manual (misal: major bump untuk breaking change):

1. Buka GitHub → Actions → "Auto Changelog"
2. Klik "Run workflow"
3. Pilih bump type: `major`, `minor`, `patch`
4. Klik "Run workflow"

Atau via git tag manual:
```bash
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

## Install Git Hooks (Local)

Hooks lokal akan **warning** jika kamu push tanpa update CHANGELOG (tidak mem-block).

### Windows

```powershell
# Jalankan dari root project (usahaku.ai/)
powershell -ExecutionPolicy Bypass -File .github\hooks\install.ps1
```

### Linux / macOS

```bash
# Copy hook ke .git/hooks/
cp .github/hooks/pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Manual CHANGELOG Update

Jika kamu ingin update CHANGELOG secara manual:

1. Buka `CHANGELOG.md`
2. Tambahkan entry di bagian atas (setelah `---` header), dengan format:

```markdown
## [X.Y.Z] — YYYY-MM-DD

### ✨ Added
- Fitur baru A
- Fitur baru B

### 🐛 Fixed
- Bug yang diperbaiki

### 🔧 Changed
- Perubahan pada fitur X
```

3. Commit seperti biasa:
```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v0.3.0"
git push
```

## File Structure

```
usahaku.ai/
├── .github/
│   ├── hooks/
│   │   ├── README.md          ← Kamu di sini
│   │   ├── pre-push.ps1       ← Windows PowerShell hook
│   │   ├── pre-push.sh        ← Linux/bash hook
│   │   └── install.ps1        ← Installer untuk Windows
│   └── workflows/
│       └── changelog.yml      ← GitHub Actions CI workflow
├── CHANGELOG.md               ← File changelog yang di-update otomatis
└── ARCHITECTURE.md            ← Developer onboarding docs
```

## Troubleshooting

### CHANGELOG tidak terupdate setelah push?

1. Cek apakah commit kamu pakai prefix yang benar (`feat:`, `fix:`, dll)
2. Cek tab Actions di GitHub — apakah workflow "Auto Changelog" sukses?
3. Jika gagal, baca log error di workflow run
4. Coba trigger manual via Actions → "Auto Changelog" → "Run workflow"

### Workflow gagal dengan "CHANGELOG.md not found"?

- Pastikan `CHANGELOG.md` ada di root project (`usahaku.ai/CHANGELOG.md`)
- Jangan rename atau pindahkan file

### Tag tidak terbuat?

- Workflow hanya membuat tag jika ada conventional commit baru
- Tag dibuat oleh `github-actions[bot]`, pastikan branch tidak protected dari bot
- Jika branch protected, tambahkan `github-actions[bot]` ke allowed actors

---

**Questions?** Buka issue atau hubungi team di `support@usahaku.ai`
