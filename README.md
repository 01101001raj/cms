# Distributor Management Portal

A comprehensive web application for managing distributors, orders, inventory, and sales operations.

## Features

- **User Management**: Multi-role support (Plant Admin, ASM, Executive, Store Admin, User)
- **Distributor Onboarding**: Streamlined process to add and manage distributors
- **Order Management**: Place orders, track history, and manage returns
- **Inventory Tracking**: Monitor central and store-level stock
- **Wallet System**: Recharge wallets and track transactions
- **Sales Analytics**: View sales reports and CEO insights
- **Scheme Management**: Create and manage promotional schemes
- **Price Tiers**: Flexible pricing for different distributor segments
- **Document Generation**: Automated invoices, dispatch notes, and e-way bills

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Database**: Supabase
- **AI Integration**: Google Gemini API
- **PDF Generation**: jsPDF
- **Build Tool**: Vite

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Google Gemini API key (for AI insights)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cms
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

4. Set up the Supabase database schema (see `supabase_schema.sql`)

## Development

Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
.
├── components/         # React components
├── hooks/             # Custom React hooks
├── services/          # API and service layer
├── utils/             # Utility functions
├── backend/           # Backend API (if applicable)
├── types.ts           # TypeScript type definitions
├── constants.tsx      # Application constants
├── App.tsx            # Main application component
└── index.tsx          # Application entry point
```

## User Roles & Permissions

- **Plant Admin**: Full access to all features
- **ASM (Area Sales Manager)**: Manage distributors, orders, and view reports
- **Executive**: Place orders, onboard distributors, view scorecard
- **Store Admin**: Manage store-level operations
- **User**: View orders, sales reports, and manage wallet

## License

Private - All rights reserved
