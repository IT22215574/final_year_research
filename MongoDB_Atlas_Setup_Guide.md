# MongoDB Atlas (MongoDB Cloud) Setup Guide

## Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account or log in to existing account
3. Create a new organization (if needed)

## Step 2: Create a New Cluster
1. Click "Create" or "Build a Database"
2. Choose **FREE** shared cluster (M0 Sandbox)
3. Select your preferred cloud provider (AWS/Google Cloud/Azure)
4. Choose a region close to your location
5. Name your cluster (e.g., "FinalYearResearch")
6. Click "Create Cluster"

## Step 3: Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and strong password
5. Set built-in role to "Read and write to any database"
6. Click "Add User"

## Step 4: Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
   - For production, add your specific IP address
4. Click "Confirm"

## Step 5: Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "5.5 or later"
5. Copy the connection string - it will look like:
   ```
   mongodb+srv://<username>:<password>@your-cluster.mongodb.net/?retryWrites=true&w=majority&appName=YourAppName
   ```

## Step 6: Update Your .env File
Replace the MONGO variable in your `.env` file with your new connection string:
```env
MONGO=mongodb+srv://your_username:your_password@your-cluster.mongodb.net/final_year_research?retryWrites=true&w=majority&appName=FinalYearResearch
```

**Important Notes:**
- Replace `<username>` with your database username
- Replace `<password>` with your database password
- Replace `your-cluster` with your actual cluster name
- Add `/final_year_research` after `.mongodb.net` to specify the database name
- Keep the query parameters for better connection handling

## Step 7: Test Connection
After updating your `.env` file, restart your backend server to test the connection.

## Security Best Practices
- Use strong passwords
- Limit IP access in production
- Keep your connection string secure and never commit it to version control
- Consider using environment-specific databases (dev, staging, prod)

## Troubleshooting
- Ensure your IP is whitelisted in Network Access
- Verify username/password are correct
- Check that the cluster is running (not paused)
- Ensure you're using the correct connection string format