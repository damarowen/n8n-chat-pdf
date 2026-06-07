# Infra — Vercel deployment via Terraform

Terraform stack untuk men-deploy `chat-ui/` (Next.js) ke Vercel dengan:

- ✅ Auto-deploy dari GitHub repo `damarowen/n8n-chat-pdf`
- ✅ Root directory di-set ke `chat-ui/` (monorepo-aware)
- ✅ Env var `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` injected
- ✅ Custom domain `askingpdf.damarowen.blog` dengan auto-SSL

---

## 📋 Prerequisites

| Item | Cara cek |
|---|---|
| Terraform ≥ 1.6 | `terraform version` |
| Vercel API token | https://vercel.com/account/tokens |
| Vercel ⇄ GitHub connected | https://vercel.com/account/login-connections — tombol "Disconnect" muncul = ✅ |
| Repo `damarowen/n8n-chat-pdf` ada di GitHub | https://github.com/damarowen/n8n-chat-pdf |
| Akses DNS untuk `damarowen.blog` | Untuk set CNAME `chat` |

---

## 🚀 Setup

### 1. Set env var token

```bash
# Set di shell saat ini saja
export VERCEL_API_TOKEN=xxx

# Atau permanen di ~/.zshrc
echo 'export VERCEL_API_TOKEN=xxx' >> ~/.zshrc
source ~/.zshrc
```

### 2. Buat `terraform.tfvars`

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars → isi n8n_chat_webhook_url dengan URL webhook beneran
```

### 3. Init + plan + apply

```bash
terraform init
terraform plan
terraform apply
```

Saat `apply` selesai, output akan menampilkan instruksi DNS.

### 4. Set DNS untuk custom domain

Di DNS provider `damarowen.blog`, tambah CNAME record:

```
Name  : chat
Type  : CNAME
Value : cname.vercel-dns.com
TTL   : 300 (atau auto)
```

Tunggu 1–30 menit. Vercel otomatis issue SSL cert.

### 5. Verifikasi

```bash
curl -I https://askingpdf.damarowen.blog
# HTTP/2 200 OK setelah DNS aktif
```

---

## 🔄 Update env var

Edit `terraform.tfvars` → `terraform apply`. Vercel akan trigger re-deploy otomatis kalau `target` env var berubah.

## 🗑️ Destroy (hati-hati!)

```bash
terraform destroy
```

Akan hapus project + domain di Vercel, **tapi tidak hapus repo GitHub**.

---

## 📁 File structure

```
infra/
├── versions.tf              # Terraform & provider version locks
├── providers.tf             # Provider config (token dari env var)
├── variables.tf             # Input variables
├── main.tf                  # Vercel project + env var + domain
├── outputs.tf               # URLs + DNS instructions
├── terraform.tfvars.example # Template
├── terraform.tfvars         # (gitignored) Nilai sebenarnya
└── README.md                # File ini
```

## 🔐 Security notes

- `terraform.tfvars` + `*.tfstate` sudah di-gitignore di root `.gitignore`
- Token Vercel hanya di env var, **tidak pernah disimpan di file**
- `NEXT_PUBLIC_*` env var akan ter-bundle ke client JS — jangan taruh secret di sini
