#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Expo development server...');

const mobileDir = path.resolve(__dirname, 'mobile');
process.chdir(mobileDir);

console.log('📁 Working directory:', process.cwd());
console.log('🔍 Checking for Expo installation...');

try {
  // Try to run expo start using npx
  console.log('▶️  Starting with npx expo...');
  execSync('npx expo start --clear', { 
    stdio: 'inherit', 
    cwd: mobileDir 
  });
} catch (error) {
  console.error('❌ Failed to start Expo:', error.message);
  process.exit(1);
}