# 🚀 Quick Deployment Guide

## Step-by-Step Deployment Instructions

### 📦 Step 1: Prepare Your Code

1. **Make sure your code is ready**:
   ```bash
   cd /home/pranjal-garg/Desktop/Dass_A1
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Name: `felicity-event-management`
   - Don't initialize with README
   - Click "Create repository"

3. **Push your code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/felicity-event-management.git
   git branch -M main
   git push -u origin main
   ```

---

### 🖥️ Step 2: Deploy Backend to Render

1. **Go to Render**: https://render.com (Sign up with GitHub)

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select your `felicity-event-management` repository
   
3. **Configure Service**:
   ```
   Name: felicity-backend
   Region: (Choose your region)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```

4. **Add Environment Variables** (Click "Advanced"):
   
   Copy-paste these one by one:
   
   ```
   PORT
   5000
   
   MONGO_URI
   mongodb+srv://felicity_db:Garg2006@cluster0.5jojd.mongodb.net/?appName=Cluster0
   
   JWT_SECRET
   9a51507a0d097774f348204cad91c75365c5793e203886261616a797ee854c24
   
   NODE_ENV
   production
   
   EMAIL_HOST
   smtp.gmail.com
   
   EMAIL_PORT
   587
   
   EMAIL_SECURE
   false
   
   EMAIL_USER
   felicity21dass@gmail.com
   
   EMAIL_PASS
   aetlrjdluhraqfpt
   
   EMAIL_FROM
   Felicity Events <felicity21dass@gmail.com>
   
   FRONTEND_URL
   https://temp-url.vercel.app
   ```
   
   (We'll update FRONTEND_URL later)

5. **Click "Create Web Service"**

6. **Wait for deployment** (5-10 minutes)
   - Watch the logs in Render dashboard
   - Look for "✅ MongoDB Connected" and "🚀 Server running on port 5000"

7. **Copy your backend URL**:
   - It will be something like: `https://felicity-backend-xxxx.onrender.com`
   - Test it by visiting: `https://your-backend-url.onrender.com/health`
   - You should see: `{"status":"ok","message":"Felicity Backend API is running"...}`

---

### 🌐 Step 3: Deploy Frontend to Vercel

1. **Go to Vercel**: https://vercel.com (Sign up with GitHub)

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import your `felicity-event-management` repository
   
3. **Configure Project**:
   ```
   Framework Preset: Create React App
   Root Directory: frontend
   Build Command: npm run build (auto-detected)
   Output Directory: build (auto-detected)
   Install Command: npm install (auto-detected)
   ```

4. **Add Environment Variable**:
   - Click "Environment Variables"
   - Add:
     ```
     Name: REACT_APP_API_URL
     Value: https://your-backend-url.onrender.com
     ```
   - (Use the Render URL from Step 2)

5. **Click "Deploy"**

6. **Wait for deployment** (2-3 minutes)

7. **Copy your frontend URL**:
   - It will be something like: `https://felicity-event-management.vercel.app`
   - Or you can use a custom domain

---

### 🔄 Step 4: Update Backend CORS

1. **Go back to Render dashboard**

2. **Click on your `felicity-backend` service**

3. **Go to "Environment"**

4. **Update `FRONTEND_URL`**:
   - Change from `https://temp-url.vercel.app`
   - To your actual Vercel URL: `https://felicity-event-management.vercel.app`

5. **Click "Save Changes"**

6. **Wait for automatic redeploy** (2-3 minutes)

---

### 📝 Step 5: Update deployment.txt

Open `/home/pranjal-garg/Desktop/Dass_A1/deployment.txt` and add:

```
Frontend URL: https://your-app.vercel.app
Backend URL: https://your-backend.onrender.com
Database: MongoDB Atlas (Managed Database)

Admin Credentials:
Email: admin@felicity.com
Password: Admin@123

Note: Free tier on Render - backend may sleep after 15 mins of inactivity.
First request after sleep takes 30-50 seconds to wake up.
```

---

### ✅ Step 6: Test Your Deployment

Visit your Vercel URL and test:

1. **Landing Page** ✓
   - Should load without errors
   - All three role buttons should work

2. **Admin Login** ✓
   - Login with: `admin@felicity.com` / `Admin@123`
   - Create a test organizer

3. **Organizer Login** ✓
   - Login as the organizer you created
   - Create a test event

4. **Participant** ✓
   - Create new participant account
   - Complete onboarding
   - Register for the test event
   - Check if email notification arrives

5. **Advanced Features** ✓
   - Team registration
   - QR code generation
   - Discussion forum
   - Announcements

---

### 🐛 Troubleshooting

#### Problem: CORS Error in Browser Console
**Solution**: 
- Check that `FRONTEND_URL` in Render matches your Vercel URL exactly
- No trailing slash!
- Redeploy backend after updating

#### Problem: "Failed to fetch" or Network Error
**Solution**:
- Backend might be sleeping (free tier)
- Wait 30-50 seconds and try again
- Check backend is running: Visit `https://your-backend.onrender.com/health`

#### Problem: MongoDB Connection Error
**Solution**:
- Go to MongoDB Atlas → Network Access
- Click "Add IP Address"
- Click "Allow Access from Anywhere" (0.0.0.0/0)
- Click "Confirm"

#### Problem: Blank Page on Vercel
**Solution**:
- Open browser console (F12)
- Check for errors
- Make sure `REACT_APP_API_URL` is set in Vercel environment variables
- Redeploy frontend

#### Problem: Emails Not Sending
**Solution**:
- Check Gmail settings - "Less secure app access" should be ON
- Or create an "App Password" and use that instead
- Update `EMAIL_PASS` in Render environment variables

---

### 📊 Monitoring Your App

**Render Dashboard**:
- View logs: Dashboard → Service → Logs
- Check metrics: CPU, Memory usage
- Monitor deployments

**Vercel Dashboard**:
- View deployments: Project → Deployments
- Check function logs: Deployment → View Function Logs
- Monitor bandwidth usage

**MongoDB Atlas**:
- View metrics: Clusters → Your Cluster → Metrics
- Check storage usage
- Monitor connections

---

### 🎉 You're Done!

Your app is now live at:
- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-backend.onrender.com
- **Database**: MongoDB Atlas

Share your frontend URL for evaluation! 🚀

---

### ⚠️ Important Notes

1. **Free Tier Sleep**: Backend sleeps after 15 mins inactivity. First request wakes it (slow).
2. **Email Limits**: Gmail has sending limits. For production, use SendGrid/AWS SES.
3. **File Storage**: Currently local. For production, use AWS S3 or Cloudinary.
4. **Security**: Change JWT_SECRET before going to production!

---

Need help? Check the full logs in Render/Vercel dashboards!
