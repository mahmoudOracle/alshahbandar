/**
 * Firebase Connection Test Script
 * 
 * This script verifies that your Firebase configuration is working correctly.
 * 
 * Usage:
 * 1. Save this as: firebase-test.js
 * 2. Run: node firebase-test.js
 * 
 * Make sure Firebase Admin SDK is installed:
 * npm install firebase-admin
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBVkrMWNJ1nKCYkmbSJEfnXjy1_i7SX8Co',
  authDomain: 'al-shabandar.firebaseapp.com',
  projectId: 'al-shabandar',
  storageBucket: 'al-shabandar.firebasestorage.app',
  messagingSenderId: '145557395180',
  appId: '1:145557395180:web:401b8f099bfb6d899e37c9',
  measurementId: 'G-FGH0FLMVWB',
};

const COMPANY_ID = 'uv9acIebvvNgx9ftSnPh';

async function testFirebaseConnection() {
  console.log('🧪 Firebase Connection Test\n');
  console.log('📋 Configuration:');
  console.log(`   Project ID: ${firebaseConfig.projectId}`);
  console.log(`   Company ID: ${COMPANY_ID}\n`);

  const tests = [];

  // Test 1: Check if service account exists
  console.log('1️⃣  Checking service account...');
  const serviceAccountPath = './service-account.json';
  if (!fs.existsSync(serviceAccountPath)) {
    console.log('   ⚠️  No service account file found (optional for web app)\n');
    tests.push({ name: 'Service Account', status: 'SKIPPED', message: 'Web app does not require' });
  } else {
    console.log('   ✓ Service account file found\n');
    tests.push({ name: 'Service Account', status: 'PASS', message: 'File exists' });
  }

  // Test 2: Verify Firebase config structure
  console.log('2️⃣  Validating Firebase config structure...');
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter((field) => !firebaseConfig[field]);

  if (missingFields.length === 0) {
    console.log(`   ✓ All required fields present: ${requiredFields.join(', ')}\n`);
    tests.push({ name: 'Firebase Config', status: 'PASS', message: 'All fields valid' });
  } else {
    console.log(`   ✗ Missing fields: ${missingFields.join(', ')}\n`);
    tests.push({ name: 'Firebase Config', status: 'FAIL', message: `Missing: ${missingFields.join(', ')}` });
  }

  // Test 3: Check environment variables
  console.log('3️⃣  Checking environment variables...');
  const envCompanyId = process.env.VITE_COMPANY_ID;
  if (envCompanyId) {
    console.log(`   ✓ VITE_COMPANY_ID set: ${envCompanyId}\n`);
    tests.push({ name: 'Environment Vars', status: 'PASS', message: 'VITE_COMPANY_ID set' });
  } else {
    console.log(`   ℹ VITE_COMPANY_ID not set in process.env\n`);
    tests.push({
      name: 'Environment Vars',
      status: 'INFO',
      message: 'Check .env.local file',
    });
  }

  // Test 4: Check .env.local file
  console.log('4️⃣  Checking .env.local file...');
  const envLocalPath = './.env.local';
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    if (content.includes('VITE_COMPANY_ID')) {
      console.log('   ✓ .env.local exists with VITE_COMPANY_ID\n');
      tests.push({ name: '.env.local', status: 'PASS', message: 'VITE_COMPANY_ID configured' });
    } else {
      console.log('   ⚠️  .env.local exists but VITE_COMPANY_ID not found\n');
      tests.push({
        name: '.env.local',
        status: 'WARNING',
        message: 'VITE_COMPANY_ID missing',
      });
    }
  } else {
    console.log('   ⚠️  .env.local file not found\n');
    tests.push({ name: '.env.local', status: 'WARNING', message: 'File not found' });
  }

  // Test 5: Check setup helper files
  console.log('5️⃣  Checking setup helper files...');
  const setupFiles = ['setup-firebase.html', 'setup-firebase.js', 'FIREBASE_SETUP.md'];
  const missingFiles = setupFiles.filter((file) => !fs.existsSync(file));

  if (missingFiles.length === 0) {
    console.log(`   ✓ All setup files present: ${setupFiles.join(', ')}\n`);
    tests.push({
      name: 'Setup Files',
      status: 'PASS',
      message: 'All helpers available',
    });
  } else {
    console.log(`   ⚠️  Missing setup files: ${missingFiles.join(', ')}\n`);
    tests.push({
      name: 'Setup Files',
      status: 'WARNING',
      message: `Missing: ${missingFiles.join(', ')}`,
    });
  }

  // Summary
  console.log('📊 Test Summary\n');
  console.log('┌─────────────────────┬────────┬──────────────────────────┐');
  console.log('│ Test                │ Status │ Details                  │');
  console.log('├─────────────────────┼────────┼──────────────────────────┤');

  let passCount = 0;
  let failCount = 0;

  tests.forEach((test) => {
    const status = test.status.padEnd(6);
    const testName = test.name.padEnd(20);
    const message = test.message.substring(0, 24).padEnd(24);

    console.log(`│ ${testName} │ ${status} │ ${message} │`);

    if (test.status === 'PASS' || test.status === 'SKIPPED') passCount++;
    if (test.status === 'FAIL') failCount++;
  });

  console.log('└─────────────────────┴────────┴──────────────────────────┘\n');

  // Final verdict
  if (failCount === 0) {
    console.log('✅ All tests passed! Your Firebase configuration is ready.\n');
    console.log('🚀 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Open browser to http://localhost:5173');
    console.log('   3. Complete Firebase setup if prompted\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review and fix the issues above.\n');
    process.exit(1);
  }
}

// Run tests
testFirebaseConnection().catch((err) => {
  console.error('❌ Test error:', err.message);
  process.exit(1);
});
