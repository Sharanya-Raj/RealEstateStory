# GitHub Actions Setup for Automated Deployment

This guide explains how to set up automated deployment to Vultr using GitHub Actions.

## Setup Steps

### 1. Generate SSH Key Pair

On your local machine:
```bash
ssh-keygen -t ed25519 -C "github-actions@ghiblinest"
# Save as: github-actions-vultr
```

This creates two files:
- `github-actions-vultr` (private key)
- `github-actions-vultr.pub` (public key)

### 2. Add Public Key to Vultr Server

Copy your public key to the Vultr server:
```bash
ssh-copy-id -i github-actions-vultr.pub root@YOUR_VULTR_IP
```

Or manually:
```bash
# Copy the public key
cat github-actions-vultr.pub

# SSH to your Vultr server
ssh root@YOUR_VULTR_IP

# Add to authorized_keys
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Add Secrets to GitHub

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `VULTR_HOST` | Your Vultr server IP | `123.45.67.89` |
| `VULTR_USERNAME` | SSH username | `root` |
| `VULTR_SSH_KEY` | Private key content | Contents of `github-actions-vultr` |
| `VULTR_PORT` | SSH port (optional) | `22` |

To get the private key content:
```bash
cat github-actions-vultr
# Copy entire content including -----BEGIN and -----END lines
```

### 4. Test the Workflow

Push a change to main branch:
```bash
git add .
git commit -m "test: trigger deployment"
git push origin main
```

Watch the deployment in GitHub Actions tab of your repository.

### 5. Manual Deployment

You can also trigger deployment manually:
1. Go to Actions tab
2. Select "Deploy to Vultr" workflow
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow" button

## Workflow Behavior

The workflow:
- ✅ Triggers on push to `main` branch
- ✅ Triggers manually via workflow_dispatch
- ✅ Connects to Vultr server via SSH
- ✅ Pulls latest code from Git
- ✅ Runs deployment script (Docker or PM2)
- ✅ Checks backend health
- ✅ Reports deployment status

## Customization

### Add Slack Notifications

Add this step to `.github/workflows/deploy.yml`:
```yaml
- name: Slack Notification
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

Then add `SLACK_WEBHOOK` secret to your repository.

### Add Discord Notifications

```yaml
- name: Discord Notification
  if: always()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
    title: "Ghibli Nest Deployment"
```

### Deploy to Multiple Environments

Create separate workflow files:
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

Each with different secrets pointing to different servers.

## Troubleshooting

### SSH Connection Failed

Check:
- VULTR_HOST is correct
- VULTR_SSH_KEY is complete (including BEGIN/END lines)
- Public key is in server's `~/.ssh/authorized_keys`
- Server's SSH port is correct

Test SSH connection locally:
```bash
ssh -i github-actions-vultr root@YOUR_VULTR_IP
```

### Deployment Script Not Found

Ensure scripts are executable and committed:
```bash
chmod +x deploy-docker.sh deploy.sh
git add deploy-docker.sh deploy.sh
git commit -m "feat: add deployment scripts"
git push
```

### Health Check Failing

Adjust sleep time in workflow:
```yaml
sleep 30  # Give more time for services to start
```

Or remove health check temporarily while debugging.

### Permission Denied

Ensure GitHub Actions SSH key has proper permissions on the server:
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Security Best Practices

1. **Use Deploy Keys**: Create a dedicated SSH key just for GitHub Actions
2. **Limit Key Permissions**: Consider using a non-root user with sudo
3. **Rotate Keys**: Change SSH keys periodically
4. **Branch Protection**: Protect main branch, require PR reviews
5. **Environment Secrets**: Use different secrets for staging/production

## Alternative: Deploy from Docker Hub

Instead of SSH deployment, you can:
1. Build Docker image in GitHub Actions
2. Push to Docker Hub
3. Pull image on Vultr server

Example workflow:
```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    push: true
    tags: yourusername/ghiblinest:latest

- name: Deploy on Vultr
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.VULTR_HOST }}
    username: ${{ secrets.VULTR_USERNAME }}
    key: ${{ secrets.VULTR_SSH_KEY }}
    script: |
      docker pull yourusername/ghiblinest:latest
      docker-compose up -d --no-deps --build backend
```

## Cost

GitHub Actions free tier:
- 2,000 minutes/month for private repos
- Unlimited for public repos

Each deployment typically takes 2-3 minutes.

---

**Setup complete!** Your Ghibli Nest will now auto-deploy on every push to main. 🎉
