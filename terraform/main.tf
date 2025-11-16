
terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.1"
    }
  }
}

provider "supabase" {
  # Configuration options
}

provider "vercel" {
  # Configuration options
}

# Define resources for Supabase project, database, etc.
resource "supabase_project" "main" {
  name = "urban-manual"
  # ... other configuration
}

# Define resources for Vercel project, deployments, etc.
resource "vercel_project" "main" {
  name = "urban-manual"
  # ... other configuration
}

# Define different workspaces for staging and production environments
# terraform workspace new staging
# terraform workspace new production
