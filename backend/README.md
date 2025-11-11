# FastAPI Backend for Distributor Management System

A production-ready FastAPI backend with Supabase integration for managing distributors, orders, inventory, and sales operations.

## Features

- **Authentication**: Supabase Auth integration
- **Distributor Management**: CRUD operations for distributors
- **Order Processing**: Order placement, tracking, and returns
- **Inventory Management**: Stock tracking, transfers, and production
- **Wallet System**: Transaction management and recharges
- **Product Management**: SKUs, schemes, and price tiers
- **Store Management**: Multi-location support

## Tech Stack

- **Framework**: FastAPI 0.115.5
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Validation**: Pydantic v2
- **ASGI Server**: Uvicorn

## Prerequisites

- Python 3.11+
- Supabase project
- pip or poetry

## Installation

1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. Run the development server:
```bash
python -m app.main
# Or using uvicorn directly:
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Deployment

### Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd backend
vercel
```

3. Set environment variables in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_KEY`

### Other Platforms

The backend can be deployed to any platform that supports Python/FastAPI:
- Railway
- Render
- Heroku
- AWS Lambda (with Mangum adapter)
- Google Cloud Run
- Azure App Service

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/password-reset` - Send password reset

### Distributors
- `GET /api/v1/distributors` - List all distributors
- `GET /api/v1/distributors/{id}` - Get distributor by ID
- `POST /api/v1/distributors` - Create distributor
- `PUT /api/v1/distributors/{id}` - Update distributor
- `DELETE /api/v1/distributors/{id}` - Delete distributor

### Orders
- `GET /api/v1/orders` - List all orders
- `GET /api/v1/orders/{id}/items` - Get order items
- `POST /api/v1/orders` - Create order
- `PUT /api/v1/orders/{id}/status` - Update order status
- `DELETE /api/v1/orders/{id}` - Cancel order

### Stock Management
- `GET /api/v1/stock` - Get stock for location
- `POST /api/v1/stock/production` - Add production
- `POST /api/v1/stock/transfers` - Create stock transfer
- `GET /api/v1/stock/transfers` - List transfers
- `PUT /api/v1/stock/transfers/{id}/status` - Update transfer status

### Wallet
- `GET /api/v1/wallet/transactions` - List transactions
- `POST /api/v1/wallet/recharge` - Recharge wallet

### Products
- `GET /api/v1/products/skus` - List SKUs
- `POST /api/v1/products/skus` - Create SKU
- `GET /api/v1/products/schemes` - List schemes
- `POST /api/v1/products/schemes` - Create scheme
- `GET /api/v1/products/price-tiers` - List price tiers

### Stores
- `GET /api/v1/stores` - List stores
- `GET /api/v1/stores/{id}` - Get store by ID
- `POST /api/v1/stores` - Create store
- `PUT /api/v1/stores/{id}` - Update store

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── api/
│   │   └── routes/          # API route handlers
│   │       ├── auth.py
│   │       ├── distributors.py
│   │       ├── orders.py
│   │       ├── stock.py
│   │       ├── wallet.py
│   │       ├── products.py
│   │       └── stores.py
│   ├── core/
│   │   ├── config.py        # Configuration settings
│   │   └── supabase.py      # Supabase client
│   └── models/
│       └── schemas.py       # Pydantic models
├── requirements.txt
├── vercel.json              # Vercel deployment config
├── runtime.txt              # Python version
└── README.md
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase anon/public key | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Optional |
| `API_V1_PREFIX` | API route prefix | No (default: /api/v1) |
| `SECRET_KEY` | JWT secret key | No |

## License

Private - All rights reserved
