#!/usr/bin/env node

/**
 * Firebase Setup Script
 * 
 * This script helps you configure Firebase for the application.
 * Run: node setup-firebase.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBVkrMWNJ1nKCYkmbSJEfnXjy1_i7SX8Co',
  authDomain: 'al-shabandar.firebaseapp.com',
  projectId: 'al-shabandar',
  storageBucket: 'al-shabandar.firebasestorage.app',
  messagingSenderId: '145557395180',
  appId: '1:145557395180:web:401b8f099bfb6d899e37c9',
  measurementId: 'G-FGH0FLMVWB',
};

const COMPANY_ID = 'uv9acIebvvNgx9ftSnPh';

async function main() {
  console.log('\n📱 Firebase Setup Script\n');
  console.log('This will help you configure Firebase for your application.\n');

  const envLocalPath = path.join(process.cwd(), '.env.local');

  // Check if .env.local exists
  let existingEnv = '';
  if (fs.existsSync(envLocalPath)) {
    existingEnv = fs.readFileSync(envLocalPath, 'utf-8');
    console.log('✓ Found existing .env.local file');
  } else {
    console.log('ℹ No .env.local file found. Will create one.');
  }

  // Display current settings
  console.log('\n📋 Current Firebase Configuration:\n');
  console.log(`   Project ID: ${FIREBASE_CONFIG.projectId}`);
  console.log(`   Auth Domain: ${FIREBASE_CONFIG.authDomain}`);
  console.log(`   API Key: ${FIREBASE_CONFIG.apiKey.substring(0, 20)}...`);
  console.log(`   Company ID: ${COMPANY_ID}\n`);

  // Ask for confirmation
  const proceed = await question('Do you want to set up this Firebase project? (yes/no): ');

  if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
    console.log('\n❌ Setup cancelled.\n');
    rl.close();
    return;
  }

  // Update or create .env.local
  const envContent = updateEnvLocal(existingEnv);
  fs.writeFileSync(envLocalPath, envContent);
  console.log('\n✓ Updated .env.local\n');

  // Create a configuration file for the browser (for reference)
  const configPath = path.join(process.cwd(), 'firebase-config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        firebase: FIREBASE_CONFIG,
        companyId: COMPANY_ID,
        setupDate: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log('✓ Created firebase-config.json (for reference only)\n');

  // Summary
  console.log('✅ Setup Complete!\n');
  console.log('📌 Next steps:\n');
  console.log('   1. Start the dev server: npm run dev');
  console.log('   2. Navigate to http://localhost:5173');
  console.log('   3. The app should detect your Firebase configuration');
  console.log('   4. If prompted, click "Test Connection" then "Save & Reload"\n');
  console.log('💡 Tip: If you see "Firebase Setup Required" page, you can:\n');
  console.log('   - Use the form to paste the Firebase config');
  console.log('   - Open setup-firebase.html in your browser\n');

  rl.close();
}

function updateEnvLocal(existingContent) {
  // Parse existing env file
  const lines = existingContent.split('\n').filter((line) => line.trim());
  const envVars = new Map();

  // Parse existing variables
  lines.forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      envVars.set(key.trim(), valueParts.join('=').trim());
    }
  });

  // Update or add values
  envVars.set('VITE_COMPANY_ID', COMPANY_ID);

  // Build new content
  let newContent = '';
  const comments = lines.filter((line) => line.startsWith('#'));

  if (comments.length > 0) {
    newContent += comments.join('\n') + '\n';
  }

  for (const [key, value] of envVars) {
    newContent += `${key}=${value}\n`;
  }

  return newContent;
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});
