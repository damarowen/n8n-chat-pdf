# =============================================================================
# providers.tf — Provider configuration
# =============================================================================
# Token Vercel TIDAK di-hardcode di sini. Provider akan otomatis baca dari
# environment variable VERCEL_API_TOKEN (set di shell sebelum apply):
#
#   export VERCEL_API_TOKEN=xxx
#
# Jika pakai team account (bukan personal), set juga VERCEL_TEAM_ID.
# =============================================================================

provider "vercel" {
  # api_token = var.vercel_api_token   # opsional; default-nya dari env var
  # team      = var.vercel_team_id     # uncomment kalau pakai team
}
