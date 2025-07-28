# GitHub Pages Setup Instructions

## 🚀 Repository Created

Your mortgage calculator has been pushed to:
https://github.com/CestDiego/mortgage-calculator

## 📝 Next Steps

### 1. Enable GitHub Pages (Manual Step Required)

Since GitHub requires manual confirmation for Pages deployment, please:

1. Go to: https://github.com/CestDiego/mortgage-calculator/settings/pages
2. Under "Build and deployment":
   - Source: Select "GitHub Actions"
3. Click "Save"

### 2. Trigger the Deployment

The workflow will automatically run when you push to main. To trigger it manually:

1. Go to: https://github.com/CestDiego/mortgage-calculator/actions
2. Click on "Deploy to GitHub Pages" workflow
3. Click "Run workflow" → "Run workflow"

### 3. Configure DNS (Required for Custom Domain)

Add these DNS records to your domain (diegoberrocal.com):

```
Type: CNAME
Name: mortgage
Value: cestdiego.github.io
TTL: 3600 (or your provider's default)
```

**Alternative A Records (if CNAME doesn't work):**
```
Type: A
Name: mortgage
Value: 185.199.108.153
       185.199.109.153
       185.199.110.153
       185.199.111.153
```

### 4. Wait for Deployment

- GitHub Pages deployment: ~5-10 minutes
- DNS propagation: ~5 minutes to 48 hours (usually <1 hour)

## 🔗 Your Site URLs

Once deployed, your site will be available at:
- **Custom Domain**: https://mortgage.diegoberrocal.com
- **GitHub Pages**: https://cestdiego.github.io/mortgage-calculator

## ✅ Verification Steps

1. Check deployment status:
   - https://github.com/CestDiego/mortgage-calculator/actions

2. Check Pages settings:
   - https://github.com/CestDiego/mortgage-calculator/settings/pages

3. Test DNS propagation:
   ```bash
   dig mortgage.diegoberrocal.com
   ```

## 🔧 Troubleshooting

If the custom domain doesn't work:

1. **Check DNS propagation**:
   ```bash
   nslookup mortgage.diegoberrocal.com
   ```

2. **Verify CNAME file exists** in the deployment:
   - Should show at: https://mortgage.diegoberrocal.com/CNAME

3. **Check HTTPS certificate**:
   - GitHub automatically provisions SSL
   - May take up to 24 hours

4. **Force HTTPS** (after DNS works):
   - Go to repository Settings → Pages
   - Check "Enforce HTTPS"

## 📝 Making Updates

To update the site:

```bash
# Make your changes
git add .
git commit -m "Update description"
git push

# Deployment will trigger automatically
```

## 🎉 Success!

Once everything is configured, your mortgage calculator will be live at:
**https://mortgage.diegoberrocal.com**