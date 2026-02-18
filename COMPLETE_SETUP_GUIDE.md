# 🚀 Complete Project Setup and Run Guide

## 📋 Overview
This guide will help you set up and run your complete project with MongoDB Atlas (MongoDB Cloud) as the online database.

## 🗂️ Project Components
- **Backend**: NestJS API + Python ML API
- **Mobile**: React Native (Expo) app
- **Web**: Next.js web application
- **Database**: MongoDB Atlas (Cloud)

---

## 🎯 Step-by-Step Setup

### Step 1: MongoDB Atlas Setup
1. **Follow the detailed guide**: `MongoDB_Atlas_Setup_Guide.md`
2. **Get your connection string** from MongoDB Atlas
3. **Update Backend/.env** with your connection string

### Step 2: Test MongoDB Connection
```bash
cd Backend
node test-mongodb-connection.js
```
✅ This will verify your MongoDB Atlas connection works properly.

### Step 3: Start All Services

#### Option A: Automated Backend Setup
```bash
# Run the automated setup script
./setup-and-run-backend.bat
```

#### Option B: Manual Setup
```bash
# 1. Backend NestJS (Terminal 1)
cd Backend
npm install
npm run start:dev    # Runs on port 5000

# 2. Python ML API (Terminal 2) 
cd Backend
python -m uvicorn api_server:app --host 127.0.0.1 --port 8001 --reload

# 3. Mobile App (Terminal 3)
cd mobile
pnpm install
pnpm start          # or npx expo start

# 4. Web App (Terminal 4)
cd web-app
npm install
npm run dev         # Runs on port 3000
```

---

## 🌐 Access Your Applications

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| **NestJS API** | `http://localhost:5000/api/v1` | 5000 | Backend API with MongoDB |
| **Python ML API** | `http://localhost:8001` | 8001 | Fish price predictions |
| **API Docs** | `http://localhost:8001/docs` | 8001 | Interactive API documentation |
| **Web App** | `http://localhost:3000` | 3000 | Next.js web interface |
| **Mobile App** | Expo DevTools | Dynamic | React Native mobile app |

---

## 🗄️ Database Configuration

### ✅ MongoDB Atlas (Current Setup)
Your project is configured to use **MongoDB Atlas** (MongoDB Cloud):

```env
# In Backend/.env
MONGO=mongodb+srv://your_username:your_password@your-cluster.mongodb.net/final_year_research?retryWrites=true&w=majority&appName=FinalYearResearch
```

**Benefits of MongoDB Atlas:**
- ✅ Always available (24/7 uptime)
- ✅ Automatic backups
- ✅ Security features built-in
- ✅ Scalable storage
- ✅ No local MongoDB installation needed

---

## 🛠️ Troubleshooting

### MongoDB Connection Issues
```bash
# Test your connection
cd Backend
node test-mongodb-connection.js
```

**Common fixes:**
1. **IP Whitelist**: Add your IP in MongoDB Atlas Network Access
2. **Credentials**: Verify username/password in connection string
3. **Cluster Status**: Ensure cluster is not paused
4. **Internet**: Check your internet connection

### Port Conflicts
If you get port errors:
- **Port 5000 busy**: Change `PORT=5001` in `Backend/.env`
- **Port 8001 busy**: Use `--port 8002` in Python API command
- **Port 3000 busy**: Web app will auto-select next available port

### Mobile App Device Testing
To test on your phone/tablet:

1. **Find your computer's IP**:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux  
   ifconfig
   ```

2. **Update mobile/.env**:
   ```env
   EXPO_PUBLIC_API_KEY=http://YOUR_IP_ADDRESS:5000
   EXPO_PUBLIC_PREDICTION_API_URL=http://YOUR_IP_ADDRESS:8001
   ```

3. **Restart mobile app**:
   ```bash
   cd mobile
   pnpm start
   ```

---

## ✅ Verification Checklist

Run through this checklist to ensure everything works:

- [ ] **MongoDB Atlas**: Connection test passes
- [ ] **NestJS Backend**: Starts without errors on port 5000
- [ ] **Python API**: Available at `http://localhost:8001/docs`
- [ ] **Web App**: Loads at `http://localhost:3000`
- [ ] **Mobile App**: Expo DevTools opens successfully
- [ ] **API Communication**: Apps can connect to backend services

---

## 📝 Important Files

| File | Purpose |
|------|---------|
| `Backend/.env` | MongoDB connection + API configuration |
| `mobile/.env` | Mobile app API endpoints |
| `web-app/.env.local` | Web app API endpoints |
| `MongoDB_Atlas_Setup_Guide.md` | Detailed MongoDB Atlas setup |
| `Backend/test-mongodb-connection.js` | MongoDB connection tester |

---

## 🆘 Need Help?

1. **Check logs** in each terminal for error messages
2. **Run connection test** with `node Backend/test-mongodb-connection.js`
3. **Verify environment variables** are properly set
4. **Ensure all ports are available** (5000, 8001, 3000)
5. **Check MongoDB Atlas dashboard** for cluster status

---

## 🎉 Success!

When everything is working:
- ✅ All services running without errors
- ✅ MongoDB Atlas connected successfully  
- ✅ APIs responding to requests
- ✅ Mobile and Web apps connecting to backend

Your complete project with online MongoDB database is now ready for development and testing!