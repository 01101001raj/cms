from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, distributors, orders, stock, wallet, products, stores, reports

# Create FastAPI app with optimizations
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Backend API for Distributor Management System",
    docs_url="/docs",
    redoc_url=None  # Disable ReDoc to reduce bundle size
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(distributors.router, prefix=settings.API_V1_PREFIX)
app.include_router(orders.router, prefix=settings.API_V1_PREFIX)
app.include_router(stock.router, prefix=settings.API_V1_PREFIX)
app.include_router(wallet.router, prefix=settings.API_V1_PREFIX)
app.include_router(products.router, prefix=settings.API_V1_PREFIX)
app.include_router(stores.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Distributor Management System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/api/v1/keepalive")
async def keepalive():
    """
    Keepalive endpoint for cron jobs to prevent cold starts.
    Also warms up database connection.
    """
    from app.core.supabase import get_supabase_admin_client
    try:
        # Warm up the database connection
        supabase = get_supabase_admin_client()
        # Simple query to keep connection alive
        supabase.table("stores").select("id").limit(1).execute()
        return {
            "status": "alive",
            "message": "Backend is warm and database connection active"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
