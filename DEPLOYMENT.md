# HostMyTrip Production Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Deploy Backend + Database (Render)

1. Push your code to **GitHub** (main branch)
2. Go to [render.com](https://render.com) → Sign up with GitHub
3. Dashboard → **Blueprints** → **New Blueprint Instance**
4. Select your repository
5. Click **Apply**
6. Render automatically creates:
   - PostgreSQL database (always running)
   - Node.js backend (auto-deploys on git push)

### Step 2: Deploy Customer Portal (Vercel)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. **Add New Project** → Import GitHub repo
3. Select `frontend-client` folder as root
4. Framework: **Vite**
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Add Environment Variable:
   - `VITE_API_URL` = `https://hostmytrip-api.onrender.com/api`
8. Click **Deploy**

### Step 3: Deploy Admin Portal (Vercel)

Repeat Step 2 but:
- Root directory: `frontend-admin`
- Same environment variable
- Different project name: `hostmytrip-admin`

### Step 4: Create First Admin User (IMPORTANT!)

After backend deploys, you must create an admin user to access the admin portal:

**Option A: Via Render Shell (Recommended)**
1. Go to [render.com](https://render.com) → Your `hostmytrip-api` service
2. Click **Shell** tab (opens terminal)
3. Run:
```bash
node dist/scripts/createAdmin.js admin@yourdomain.com YourStrongPassword123
```

**Option B: Via CLI (Local connected to prod DB)**
```bash
cd backend
npm run build
DATABASE_URL="your-render-db-url" node dist/scripts/createAdmin.js admin@yourdomain.com YourStrongPassword123
```

**Create Employee Users (optional):**
```bash
node dist/scripts/createEmployee.js employee@yourdomain.com EmployeePass123 "John Doe"
```

**Admin Login:**
- URL: `https://hostmytrip-admin.vercel.app/login`
- Email: `admin@yourdomain.com`
- Password: The one you just created

### Step 5: Update Backend Environment Variables

Go to [render.com](https://render.com) → Your `hostmytrip-api` service → **Environment**:

```bash
# Update these to your actual deployed frontend URLs
FRONTEND_URL=https://hostmytrip.vercel.app
CLIENT_URL=https://hostmytrip.vercel.app
ADMIN_URL=https://hostmytrip-admin.vercel.app

# Email (Gmail with App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx  # Gmail App Password (not your real password)
EMAIL_FROM=HostMyTrip <your-email@gmail.com>

# Payment Gateways
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret
PAYPAL_API_URL=https://api-m.sandbox.paypal.com  # Change to live: https://api-m.paypal.com

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# API Keys
SERPAPI_KEY=your_serpapi_key
AMADEUS_CLIENT_ID=your_amadeus_id
AMADEUS_CLIENT_SECRET=your_amadeus_secret
TRAVELPAYOUTS_TOKEN=your_travelpayouts_token
KIWI_API_KEY=your_kiwi_key
GOOGLE_CLIENT_ID=your_google_oauth_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
```

Click **Save** → Service auto-redeploys.

---

## Automatic Deployments

Once set up, every `git push` to `main` branch automatically:
- Tests the code
- Deploys backend (Render)
- Deploys frontends (Vercel)

**Zero manual intervention needed!**

---

## Monitoring & Logs

| Platform | Where to Check |
|----------|---------------|
| **Backend Logs** | Render Dashboard → hostmytrip-api → Logs |
| **Database** | Render Dashboard → hostmytrip-db → Metrics |
| **Frontend Errors** | Vercel Dashboard → Select Project → Runtime Logs |
| **Email Delivery** | Gmail Sent folder or check Render logs for `[EmailService]` |

---

## Production Checklist

- [ ] Database connected and migrated (`npx sequelize-cli db:migrate` in Render shell)
- [ ] Email SMTP working (test with a booking)
- [ ] PayPal webhooks configured (if using live mode)
- [ ] All API keys are production keys (not sandbox)
- [ ] JWT_SECRET is different from local
- [ ] CORS configured for production domains
- [ ] SSL enabled (automatic on Render/Vercel)

---

## Troubleshooting

### Backend not starting?
```bash
# Check logs in Render Dashboard
# Common issues:
# 1. DB not connected → Check DB env vars
# 2. Port conflict → Render uses 10000, not 5000
# 3. Build failed → Check if dist/ exists after build
```

### Emails not sending?
```bash
# Check Render logs for [EmailService] errors
# Common issues:
# 1. SMTP_PASS is your Gmail password (should be App Password)
# 2. Less Secure Apps disabled (use App Password instead)
# 3. Wrong SMTP port (587 for TLS, 465 for SSL)
```

### Can't login to admin portal?
```bash
# 1. Check if admin user exists in database:
#    Go to Render Shell → psql $DATABASE_URL → SELECT email, role FROM users;
#
# 2. Create admin if missing:
#    node dist/scripts/createAdmin.js admin@yourdomain.com NewPassword123
#
# 3. Reset admin password (if locked out):
#    node -e "const bcrypt=require('bcrypt'); bcrypt.hash('NewPass123',12).then(h=>console.log(h))"
#    Then in psql: UPDATE users SET password='HASH_HERE' WHERE email='admin@yourdomain.com';
```

### Frontend can't connect to backend?
```bash
# Check browser console for CORS errors
# Fix: Ensure FRONTEND_URL in backend matches actual Vercel URL
# Wildcard CORS: Add CORS_ORIGIN=* temporarily for testing
```

---

## Costs (Approximate)

| Service | Monthly Cost |
|---------|-------------|
| Render Web Service (Starter) | $7 |
| Render PostgreSQL (Starter) | $7 |
| Vercel (Pro for team) | $0 (free tier) or $20 |
| **Total** | **~$14-34/month** |

---

## Alternative: Railway (Even Easier)

If Render feels complex, use [Railway](https://railway.app):

1. `railway login`
2. `railway init` in backend folder
3. `railway add` → Select PostgreSQL
4. `railway up`

Railway auto-detects everything, creates DB, deploys in one command.
