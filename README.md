# Mortgage Calculator

A modern, client-side mortgage calculator built with TypeScript, Vite, and Tailwind CSS. This application performs all calculations in the browser with no backend required, making it perfect for static hosting.

## Features

### Core Functionality
- **Accurate Calculations**: Uses decimal.js for precise financial calculations
- **Multiple Payment Frequencies**: Monthly, bi-weekly, and weekly payment options
- **Extra Payments**: Calculate savings from additional principal payments
- **Full Amortization Schedule**: Detailed payment breakdown for the entire loan term

### Visualizations
- **Payment Breakdown Chart**: Doughnut chart showing principal vs interest split
- **Balance Over Time**: Line chart displaying remaining balance throughout the loan
- **Interactive Tables**: Responsive amortization schedule with key payment details

### Export & Sharing
- **CSV Export**: Download the complete amortization schedule
- **Print-Friendly**: Optimized styles for printing reports
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Technology Stack

- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Interactive data visualizations
- **Decimal.js**: Arbitrary-precision decimal arithmetic

## Deployment

The application builds to static files that can be hosted anywhere:

- **GitHub Pages**: Free hosting for public repositories
- **Netlify**: Drag-and-drop deployment with CI/CD
- **Vercel**: Zero-config deployments
- **Surge.sh**: Simple, single-command publishing

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Project Structure

```
mortgage-calculator/
├── src/
│   ├── calculator.ts      # Core calculation engine
│   ├── types.ts          # TypeScript type definitions
│   ├── main.ts           # UI and application logic
│   ├── style.css         # Tailwind CSS imports
│   └── calculator.test.ts # Comprehensive test suite
├── dist/                 # Production build output
├── index.html           # Application entry point
└── package.json         # Project configuration
```

## Usage

1. Enter your loan details:
   - Loan amount
   - Interest rate (annual percentage)
   - Loan term in years
   - Payment frequency
   - Optional extra payment amount

2. View instant results:
   - Regular payment amount
   - Total interest paid
   - Payoff date
   - Interest savings from extra payments

3. Explore visualizations:
   - See how much goes to principal vs interest
   - Track your loan balance over time

4. Export your data:
   - Download complete amortization schedule as CSV
   - Print reports for your records

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Initial Load**: ~90KB gzipped
- **No External APIs**: All calculations performed locally
- **Instant Results**: No network latency
- **Offline Capable**: Works without internet connection

## Contributing

This is a demonstration project showcasing modern web development practices. Feel free to fork and customize for your needs.

## License

MIT License - See LICENSE file for details