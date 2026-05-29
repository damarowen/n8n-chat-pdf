# =============================================================================
# outputs.tf — Useful values after apply
# =============================================================================

output "project_id" {
  description = "ID project Vercel — dipakai kalau mau dirujuk dari resource lain."
  value       = vercel_project.chat_ui.id
}

output "project_name" {
  description = "Nama project Vercel."
  value       = vercel_project.chat_ui.name
}

output "default_url" {
  description = "URL default Vercel (*.vercel.app) sebelum DNS custom domain aktif."
  value       = "https://${vercel_project.chat_ui.name}.vercel.app"
}

output "custom_domain_url" {
  description = "URL production setelah DNS terpropagasi."
  value       = "https://${var.custom_domain}"
}

output "dns_setup_instruction" {
  description = "Langkah setup DNS untuk custom domain."
  value       = <<-EOT
    Untuk mengaktifkan ${var.custom_domain}:

    1. Login ke DNS provider domain `damarowen.blog`.
    2. Tambahkan CNAME record:
         Name  : chat
         Value : cname.vercel-dns.com
         TTL   : 300 (atau auto)
    3. Tunggu propagasi (1–30 menit). Vercel auto-issue SSL via Let's Encrypt.
    4. Cek di https://vercel.com/${var.github_owner}/${vercel_project.chat_ui.name}/settings/domains
  EOT
}
