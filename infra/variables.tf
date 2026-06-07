# =============================================================================
# variables.tf — Input variables (override via terraform.tfvars)
# =============================================================================

variable "project_name" {
  type        = string
  description = "Nama project di Vercel (juga jadi subdomain default *.vercel.app)."
  default     = "n8n-chat-pdf"
}

variable "github_owner" {
  type        = string
  description = "GitHub owner / username pemilik repo."
  default     = "damarowen"
}

variable "github_repo" {
  type        = string
  description = "Nama repo GitHub (tanpa owner)."
  default     = "n8n-chat-pdf"
}

variable "production_branch" {
  type        = string
  description = "Branch yang dianggap production di Vercel (akan auto-deploy ke domain utama)."
  default     = "main"
}

variable "root_directory" {
  type        = string
  description = "Subfolder di repo yang berisi Next.js app. Penting karena repo kita monorepo-style."
  default     = "chat-ui"
}

variable "custom_domain" {
  type        = string
  description = "Custom domain untuk production deployment."
  default     = "askingpdf.damarowen.blog"
}

variable "n8n_chat_webhook_url" {
  type        = string
  description = "URL webhook n8n untuk chat-ui (NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL)."
  # NEXT_PUBLIC_* akan ter-bundle ke client bundle, jadi tidak dianggap rahasia.
  sensitive = false
}
