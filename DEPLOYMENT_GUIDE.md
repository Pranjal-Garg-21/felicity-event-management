# 🚀 Deployment Guide - Felicity Event Management System

This guide provides step-by-step instructions for deploying the application to production.

## 📋 Prerequisites

Before deploying, ensure you have:
- GitHub account
- Vercel account (for frontend)
- Render account (for backend)
- MongoDB Atlas account (for database)
- Gmail account with App Password (for email service)

---

## 🗄️ Database Setup (MongoDB Atlas)

1. **Create MongoDB Atlas Cluster:**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Sign in and create a new project
   - Click "Build a Database" → Choose FREE tier (M0)
   - Select your preferred cloud provider and region
   - Create cluster

2. **Configure Database Access:**
   - Go to "Database Access" → Add New Database User
   - Create username and strong password (save these!)
   - Set privileges to "Read and write to any database"

3. **Configure Network Access:**
   - Go to "Network Access" → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for production
   - Or add specific IPs if you know your server IPs

4. **Get Connection String:**
   - Go to "Database" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `felicity_db` or your preferred name
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/felicity_db?retryWrites=true&w=majority`

---

## 🔧 Backend Deployment (Render)

### Step 1: Push Code to GitHub

```bash
# Navigate to project root
cd /home/pranjal-garg/Desktop/Dass_A1

# Initialize git (if not already done)
git init
git add .
git commit -m "Prepare for deployment"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/felicity-backend.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render

1. **Create Render Account:**
   - Go to [Render](https://render.com/)
   - Sign up with GitHub

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your backend code

3. **Configure Build Settings:**
   - **Name:** `felicity-backend` (or your choice)
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free

4. **Add Environment Variables:**
   Click "Advanced" → Add the following environment variables:

   ```
   PORT=5000
   NODE_ENV=production
   MONGO_URI=mongodb+srv://your_connection_string_here
   JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password
   EMAIL_FROM=your_email@gmail.com
   FRONTEND_URL=https://your-app-name.vercel.app
   ```

   **Important Notes:**
   - Generate a strong JWT_SECRET (use: `openssl rand -base64 32`)
   - For EMAIL_PASS, use Gmail App Password (not regular password)
   - FRONTEND_URL will be filled after deploying frontend

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL: `https://your-app-name.onrender.com`

6. **Verify Deployment:**
   - Visit: `https://your-app-name.onrender.com/health`
   - Should see: `{"status":"ok","message":"Felicity Backend API is running"}`

7. **Seed Admin Account:**
   - Once deployed, you need to run the seed script
   - Go to Render dashboard → Shell tab
   - Run: `node seedAdmin.js`

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Push Frontend to GitHub (if separate repo)

```bash
cd frontend
git init
git add .
git commit -m "Prepare frontend for deployment"
git remote add origin https://github.com/YOUR_USERNAME/felicity-frontend.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. **Create Vercel Account:**
   - Go to [Vercel](https://vercel.com/)
   - Sign up with GitHub

2. **Import Project:**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select the frontend repository

3. **Configure Project:**
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend` (if monorepo) or leave blank
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `build` (auto-detected)

4. **Add Environment Variables:**
   Go to "Environment Variables" section and add:

   ```
   REACT_APP_API_URL=https://your-backend-app.onrender.com
   ```

   Replace with your actual Render backend URL

5. **Deploy:**
   - Click "Deploy"
   - Wait for build (2-5 minutes)
   - Note your frontend URL: `https://your-app-name.vercel.app`

6. **Update Backend CORS:**
   - Go back to Render dashboard
   - Update `FRONTEND_URL` environment variable with your Vercel URL
   - Render will automatically redeploy

---

## ✅ Post-Deployment Setup

### 1. Test Authentication
- Visit your frontend URL
- Try signing up as a participant
- Try logging in as admin (`admin@felicity.com` / `admin123`)

### 2. Create Organizer Account
- Login as admin
- Create an organizer account with Discord webhook URL

### 3. Test Event Creation
- Login as organizer
- Create an event
- Verify Discord webhook posts event (if configured)

### 4. Test Registration Flow
- Login as participant
- Register for an event
- Verify email ticket is sent
- Check QR code in email

---

## 🔐 Gmail App Password Setup

To send emails, you need a Gmail App Password:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Other (Custom name)"
5. Name it "Felicity Event System"
6. Copy the 16-character password
7. Use this as `EMAIL_PASS` in backend environment variables

---

## 🔔 Discord Webhook Setup (Optional)

1. **Create Discord Server** (if you don't have one)
2. **Create Webhook:**
   - Go to Server Settings → Integrations → Webhooks
   - Click "New Webhook"
   - Name it "Felicity Events"
   - Choose a channel (e.g., #events)
   - Copy the webhook URL
3. **Add to Organizer Profile:**
   - Login as organizer
   - Go to Profile Settings
   - Paste webhook URL
   - Save profile
4. **Test:**
   - Create and publish an event
   - Check Discord channel for announcement

---

## 📱 Production URLs

After deployment, you'll have:

**Frontend URL:** `https://your-app-name.vercel.app`
**Backend URL:** `https://your-backend-app.onrender.com`
**API Health:** `https://your-backend-app.onrender.com/health`

---

## 🐛 Troubleshooting

### Backend Issues

**500 Server Error:**
- Check Render logs (Dashboard → Logs tab)
- Verify all environment variables are set
- Check MongoDB connection string

**CORS Error:**
- Verify `FRONTEND_URL` in backend matches your Vercel URL
- Check browser console for exact error

**Email Not Sending:**
- Verify Gmail App Password is correct
- Check EMAIL_USER and EMAIL_FROM match

### Frontend Issues

**API Calls Failing:**
- Verify `REACT_APP_API_URL` is set correctly in Vercel
- Check browser Network tab for failed requests
- Verify backend is running (`/health` endpoint)

**Build Failing:**
- Check Vercel build logs
- Verify all dependencies are in package.json
- Test build locally: `npm run build`

### Database Issues

**Connection Timeout:**
- Verify Network Access allows 0.0.0.0/0
- Check connection string format
- Verify database user credentials

---

## 📊 Monitoring

### Render Dashboard
- View real-time logs
- Monitor resource usage
- Check deployment status

### Vercel Dashboard
- View build logs
- Monitor function executions
- Check analytics

### MongoDB Atlas
- Monitor database performance
- View connection metrics
- Check storage usage

---

## 🔄 Updating Your Deployment

### Backend Updates
1. Push code to GitHub: `git push origin main`
2. Render auto-deploys on push
3. Monitor deployment in Render dashboard

### Frontend Updates
1. Push code to GitHub: `git push origin main`
2. Vercel auto-deploys on push
3. Monitor deployment in Vercel dashboard

---

## 💰 Cost Estimate

**Free Tier Limits:**
- **Vercel:** Unlimited deployments, 100GB bandwidth/month
- **Render:** 750 hours/month (enough for 1 service), sleeps after 15 min inactivity
- **MongoDB Atlas:** 512MB storage, shared cluster
- **Gmail:** 500 emails/day (free account)

**Note:** Render free tier sleeps after 15 minutes of inactivity. First request after sleep takes 30-60 seconds to wake up.

---

## 🎯 Production Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Backend deployed to Render
- [ ] Backend environment variables set
- [ ] Backend health endpoint working
- [ ] Admin account seeded
- [ ] Frontend deployed to Vercel
- [ ] Frontend environment variable set (REACT_APP_API_URL)
- [ ] CORS configured with production URLs
- [ ] Gmail App Password created and configured
- [ ] Test email sending works
- [ ] Discord webhook (optional) configured
- [ ] Test full user registration flow
- [ ] Test event creation and registration
- [ ] Test QR code generation and scanning
- [ ] Document production URLs

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Render/Vercel logs
3. Test locally first to isolate the issue
4. Check MongoDB Atlas metrics

---

## 🎉 Success!

Once everything is deployed and tested, you'll have:
- ✅ Production frontend on Vercel
- ✅ Production backend on Render
- ✅ MongoDB Atlas database
- ✅ Email notifications working
- ✅ Discord integration (optional)
- ✅ QR code ticket system
- ✅ Full event management system

**Share your URLs:**
- Frontend: `https://your-app-name.vercel.app`
- Backend API: `https://your-backend-app.onrender.com`
