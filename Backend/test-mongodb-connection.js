// MongoDB Atlas Connection Tester
// Run this script to test your MongoDB Atlas connection
// Usage: node test-mongodb-connection.js

const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO || process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ Error: No MongoDB connection string found in .env file');
  console.error('   Please set the MONGO variable in your .env file');
  process.exit(1);
}

console.log('🔄 Testing MongoDB Atlas connection...');
console.log('📍 Connection URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

async function testConnection() {
  try {
    // Configure connection options for Atlas (updated for newer Mongoose versions)
    const options = {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    };

    console.log('⏳ Attempting to connect to MongoDB Atlas...');
    
    await mongoose.connect(mongoUri, options);
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log('🏷️  Database name:', mongoose.connection.db.databaseName);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('📊 Ready state:', mongoose.connection.readyState);
    
    // Test database operations
    console.log('🔍 Testing database operations...');
    
    // Create a simple test collection and document
    const TestModel = mongoose.model('ConnectionTest', new mongoose.Schema({
      timestamp: { type: Date, default: Date.now },
      message: String
    }));

    const testDoc = new TestModel({ 
      message: 'MongoDB Atlas connection test successful!' 
    });
    
    await testDoc.save();
    console.log('✅ Successfully created test document');
    
    const foundDoc = await TestModel.findOne().sort({ timestamp: -1 });
    console.log('✅ Successfully retrieved test document:', foundDoc.message);
    
    // Clean up test document
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('✅ Successfully deleted test document');
    
    console.log('\n🎉 MongoDB Atlas is working perfectly!');
    console.log('   Your NestJS application should now connect successfully.');
    
  } catch (error) {
    console.error('\n❌ MongoDB Atlas connection failed:');
    console.error('📋 Error details:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify the cluster hostname in your connection string');
      console.error('   3. Ensure the cluster is not paused');
    }
    
    if (error.message.includes('Authentication failed')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Check your username and password');
      console.error('   2. Verify the user has proper database permissions');
      console.error('   3. Ensure special characters in password are URL-encoded');
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Check Network Access settings in MongoDB Atlas');
      console.error('   2. Add your IP address to the whitelist');
      console.error('   3. Try allowing access from anywhere (0.0.0.0/0) for testing');
    }
    
    process.exit(1);
  } finally {
    try {
      await mongoose.connection.close();
      console.log('🔌 Connection closed');
    } catch (closeError) {
      console.error('⚠️  Error closing connection:', closeError.message);
    }
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, closing connection...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, closing connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the test
testConnection();