# Deployment Guide

This guide covers deploying both the frontend (React + Vite) and backend (FastAPI + Supabase) to Vercel.

## Prerequisites

- GitHub account
- Vercel account
- Supabase project
- Google Gemini API key (for AI features)

## Backend Deployment (FastAPI)

### Option 1: Deploy to Vercel

1. **Prepare Backend**
   ```bash
   cd backend
   ```

2. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Select your project scope
   - Link to existing project or create new one

4. **Set Environment Variables** in Vercel Dashboard
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key (optional)
   - `SECRET_KEY`: Generate a secure random string

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

6. **Note Your Backend URL**
   - Example: `https://your-backend.vercel.app`

### Option 2: Deploy to Other Platforms

**Railway**
```bash
railway login
railway init
railway up
```

**Render**
- Connect your GitHub repo
- Set build command: `pip install -r requirements.txt`
- Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Frontend Deployment (React + Vite)

### Deploy to Vercel

1. **Update Environment Variables**

   Create `.env.production` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   VITE_API_URL=https://your-backend.vercel.app/api/v1
   ```

2. **Deploy via GitHub** (Recommended)

   a. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

   b. Go to [Vercel Dashboard](https://vercel.com/dashboard)

   c. Click "Add New Project"

   d. Import your GitHub repository

   e. Configure project:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

   f. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `VITE_API_URL` (if using separate backend)

   g. Click "Deploy"

3. **Deploy via CLI** (Alternative)

   ```bash
   # From project root
   vercel

   # Set environment variables
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add GEMINI_API_KEY

   # Deploy to production
   vercel --prod
   ```

## Supabase Setup

### 1. Create Tables

Run the SQL from `supabase_schema.sql` in your Supabase SQL Editor.

### 2. Set Up Authentication

1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates (optional)

### 3. Set Up Row Level Security (RLS)

Example policies:

```sql
-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Distributors table
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read distributors"
  ON distributors FOR SELECT
  TO authenticated
  USING (true);

-- Continue for other tables...
```

### 4. Get API Keys

1. Go to Settings > API
2. Copy:
   - Project URL (`SUPABASE_URL`)
   - Anon/Public key (`SUPABASE_KEY`)
   - Service role key (`SUPABASE_SERVICE_KEY`) - Keep this secret!

## Post-Deployment

### 1. Test the Application

- Visit your Vercel URL
- Test login functionality
- Verify database connections
- Check API endpoints

### 2. Configure Custom Domain (Optional)

1. Go to Vercel Dashboard > Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed

### 3. Set Up Continuous Deployment

Vercel automatically deploys when you push to your main branch.

To deploy specific branches:
1. Go to Project Settings > Git
2. Configure production/preview branches

## Environment Variables Reference

### Frontend (.env)
```env
VITE_SUPABASE_URL=          # Supabase project URL
VITE_SUPABASE_ANON_KEY=     # Supabase anon key
GEMINI_API_KEY=             # Google Gemini API key
VITE_API_URL=               # Backend API URL (optional)
```

### Backend (.env)
```env
SUPABASE_URL=               # Supabase project URL
SUPABASE_KEY=               # Supabase anon key
SUPABASE_SERVICE_KEY=       # Supabase service role key
SECRET_KEY=                 # JWT secret (generate random string)
```

## Troubleshooting

### Build Fails

1. Check Node.js version (use 18.x or 20.x)
2. Clear cache: `rm -rf node_modules package-lock.json && npm install`
3. Check build logs in Vercel dashboard

### API Errors

1. Verify Supabase credentials
2. Check CORS settings in backend
3. Verify environment variables are set
4. Check Supabase logs for database errors

### Authentication Issues

1. Verify Supabase Auth is enabled
2. Check redirect URLs in Supabase dashboard
3. Verify JWT secret is set correctly

## Monitoring

### Vercel Analytics

Enable in Project Settings > Analytics

### Supabase Monitoring

- Check Database > Logs for query errors
- Monitor Authentication > Logs for auth issues
- Review API > Logs for request errors

## Scaling Considerations

1. **Database**: Upgrade Supabase plan for more connections
2. **Backend**: Vercel automatically scales
3. **Caching**: Implement Redis for session management
4. **CDN**: Vercel includes CDN by default

## Security Checklist

- [ ] Enable RLS on all Supabase tables
- [ ] Set strong JWT secrets
- [ ] Use service role key only in backend
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Set up CORS properly
- [ ] Implement rate limiting
- [ ] Regular security audits
- [ ] Keep dependencies updated

## Backup Strategy

1. **Database**: Use Supabase automatic backups
2. **Code**: Maintain Git repository
3. **Environment Variables**: Store securely (1Password, AWS Secrets Manager)

## Support

For issues:
1. Check Vercel deployment logs
2. Review Supabase logs
3. Check browser console for frontend errors
4. Review API documentation at `/docs` endpoint
