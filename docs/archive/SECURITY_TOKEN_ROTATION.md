# Security: JWT Token Exposure in Git History

## Issue

A Supabase JWT token was detected in git history by gitleaks. While the current files are clean (no hardcoded tokens), the token exists in previous commits.

## Current Status

✅ **Current files are clean** - No hardcoded tokens in:
- `scripts/generate_ai_fields.py`
- `scripts/generate_embeddings.py`

❌ **Token exists in git history** - The token appears in commits:
- `2ee8331b` - Initial commit with token
- `0a963591` - Attempted fix (still had token)
- `2afee637` - Token removed (current state)

## Required Actions

### 1. Rotate the Supabase Service Role Key (CRITICAL)

Since the token is exposed in git history, you **must** rotate it:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Under **Service Role Key**, click **Reset** or **Rotate**
4. Save the new key securely
5. Update all environment variables:
   - `.env.local` (local development)
   - Vercel environment variables (production)
   - Any CI/CD systems
   - Any other services using this key

### 2. Clean Git History (Optional but Recommended)

To remove the token from git history, you can use `git filter-repo`:

```bash
# Install git-filter-repo if not already installed
# macOS: brew install git-filter-repo
# Or: pip install git-filter-repo

# Remove the token from all history
git filter-repo --replace-text <(echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZG5lZmRmd3Zwamt1YW5oZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTg4MzMsImV4cCI6MjA2OTI5NDgzM30.imGFTDynzDG5bK0w_j5pgwMPBeT9rkXm8ZQ18W6A-nw==>[REDACTED]')

# Force push (WARNING: This rewrites history)
git push origin --force --all
```

**⚠️ WARNING**: This rewrites git history. Coordinate with your team before doing this.

### 3. Alternative: Use BFG Repo-Cleaner

```bash
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/

# Create a file with the token to remove
echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZG5lZmRmd3Zwamt1YW5oZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTg4MzMsImV4cCI6MjA2OTI5NDgzM30.imGFTDynzDG5bK0w_j5pgwMPBeT9rkXm8ZQ18W6A-nw' > tokens.txt

# Remove from history
java -jar bfg.jar --replace-text tokens.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

## Prevention

To prevent this in the future:

1. ✅ **Never hardcode tokens** - Always use environment variables
2. ✅ **Use pre-commit hooks** - Install gitleaks as a pre-commit hook:
   ```bash
   # Install gitleaks
   brew install gitleaks  # macOS
   # or download from https://github.com/gitleaks/gitleaks/releases
   
   # Add to .git/hooks/pre-commit
   #!/bin/sh
   gitleaks protect --staged --verbose
   ```
3. ✅ **Use `.env.example`** - Document required env vars without values
4. ✅ **Review PRs** - Always review code for hardcoded secrets before merging

## Verification

After rotation, verify:

```bash
# Check current files (should be clean)
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" scripts/ || echo "✅ No tokens in current files"

# Test scripts work with new key
export SUPABASE_SERVICE_ROLE_KEY="your-new-key"
python scripts/generate_ai_fields.py --help
```

## Timeline

- **Exposed**: Token committed in commit `2ee8331b`
- **Detected**: By gitleaks scan
- **Removed from code**: Commit `2afee637`
- **Action required**: Rotate key immediately

