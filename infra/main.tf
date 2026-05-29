# =============================================================================
# main.tf — Vercel project + env var + custom domain
# =============================================================================
# Resource yang dibuat:
#   1. vercel_project                          — project + GitHub integration
#   2. vercel_project_environment_variable     — NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL
#   3. vercel_project_domain                   — custom domain (chat.damarowen.blog)
# =============================================================================

# -----------------------------------------------------------------------------
# 1. Project Vercel — auto-deploy dari GitHub repo `damarowen/n8n-chat-pdf`
# -----------------------------------------------------------------------------
resource "vercel_project" "chat_ui" {
  name      = var.project_name
  framework = "nextjs"

  # Subfolder di monorepo yang berisi Next.js (package.json ada di sini)
  root_directory = var.root_directory

  # Integrasi GitHub — Vercel akan auto-deploy pada push ke production_branch
  # dan bikin preview deployment untuk branch/PR lain.
  git_repository = {
    type              = "github"
    repo              = "${var.github_owner}/${var.github_repo}"
    production_branch = var.production_branch
  }
}

# -----------------------------------------------------------------------------
# 2. Environment variable — NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL
#    Berlaku di semua target (production, preview, development).
# -----------------------------------------------------------------------------
resource "vercel_project_environment_variable" "n8n_webhook" {
  project_id = vercel_project.chat_ui.id
  key        = "NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL"
  value      = var.n8n_chat_webhook_url
  target     = ["production", "preview", "development"]
}

# -----------------------------------------------------------------------------
# 3. Custom domain — chat.damarowen.blog
#    Setelah apply, set CNAME `chat` -> `cname.vercel-dns.com` di DNS provider.
# -----------------------------------------------------------------------------
resource "vercel_project_domain" "custom" {
  project_id = vercel_project.chat_ui.id
  domain     = var.custom_domain
}
