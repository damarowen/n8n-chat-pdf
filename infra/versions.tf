# =============================================================================
# versions.tf — Terraform & provider version constraints
# =============================================================================
# Mengunci versi Terraform CLI + provider Vercel agar plan/apply reproducible
# di mesin manapun (lokal, CI, dll). Update versinya secara berkala dengan
# `terraform init -upgrade` setelah membaca changelog provider.
# =============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }
}
