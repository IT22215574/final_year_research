#!/usr/bin/env node

console.log('🚀 Starting Fixed Backend Server...');
const { spawn } = require('child_process');
const path = require('path');

const backendDir = path.resolve(__dirname, 'Backend');
process.chdir(backendDir);

console.log('📁 Working in:', backendDir);

// Start the backend
const backend = spawn('npx', ['ts-node', '-r', 'tsconfig-paths/register', 'src/main.ts'], {
  stdio: 'inherit',
  shell: true,
  cwd: backendDir
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error.message);
  process.exit(1);
});

backend.on('close', (code) => {
  if (code !== 0) {
    console.log(`❌ Backend process exited with code ${code}`);
  }
});