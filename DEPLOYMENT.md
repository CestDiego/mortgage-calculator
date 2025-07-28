# Mortgage Calculator - Deployment Guide

This mortgage calculator is a static web application that can be deployed to any static hosting service.

## Build for Production

```bash
npm run build
```

This creates a `dist` directory with all the static files needed for deployment.

## Deployment Options

### 1. GitHub Pages

1. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to package.json scripts:
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

### 2. Netlify

#### Option A: Drag & Drop
1. Build the project: `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag the `dist` folder to the deployment area

#### Option B: CLI
```bash
npm install -g netlify-cli
npm run build
netlify deploy --dir=dist --prod
```

### 3. Vercel

```bash
npm install -g vercel
npm run build
vercel --prod dist
```

### 4. Surge.sh

```bash
npm install -g surge
npm run build
cd dist
surge
```

## Testing the Build Locally

After building, you can test the production build:

```bash
npm run preview
```

This will serve the built files on http://localhost:4173/

## Environment Configuration

The application runs entirely in the browser with no backend requirements. All calculations are performed client-side using JavaScript.

## Features

- **Mortgage Calculations**: Accurate amortization calculations using decimal.js
- **Payment Options**: Monthly, bi-weekly, and weekly payment frequencies
- **Extra Payments**: Calculate savings from additional principal payments
- **Visualizations**: Interactive charts showing payment breakdown and balance over time
- **Export**: Download full amortization schedule as CSV
- **Responsive**: Works on desktop, tablet, and mobile devices

## Browser Support

The application supports all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Performance

- Initial load: ~90KB gzipped
- No external API calls
- All calculations performed locally
- Instant results