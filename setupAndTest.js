#!/usr/bin/env node
require('dotenv').config();
const { spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 School Management System - Setup and Test Script');
console.log('===================================================');
console.log('');
console.log('This script will:');
console.log('1. Seed the database with test data');
console.log('2. Start the server');
console.log('3. Run API tests against the running server');
console.log('');

rl.question('Would you like to proceed? (y/n): ', (answer) => {
  if (answer.toLowerCase() !== 'y') {
    console.log('Operation cancelled. Exiting...');
    rl.close();
    return;
  }

  rl.question('This will clear all existing data. Are you sure? (y/n): ', (confirmation) => {
    if (confirmation.toLowerCase() !== 'y') {
      console.log('Operation cancelled. Exiting...');
      rl.close();
      return;
    }

    console.log('\n📥 Step 1: Seeding the database...');
    
    // Run the seed script
    const seedProcess = spawn('node', ['seedData.js'], { stdio: 'inherit' });
    
    seedProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Database seeding failed with code:', code);
        rl.close();
        return;
      }
      
      console.log('✅ Database seeded successfully!');
      console.log('\n🖥️ Step 2: Starting the server...');
      
      // Start the server in a separate process
      const serverProcess = spawn('node', ['app.js'], {
        detached: true, 
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let serverOutput = '';
      
      // Capture server output to detect when it's ready
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        console.log(`[Server]: ${output.trim()}`);
        
        // Once we see the server is connected, proceed with testing
        if (output.includes('server started on port')) {
          console.log('\n🧪 Step 3: Running API tests...');
          
          // Give the server a moment to fully initialize
          setTimeout(() => {
            // Run the API tests
            const testProcess = spawn('node', ['apiTest.js'], { stdio: 'inherit' });
            
            testProcess.on('close', (testCode) => {
              if (testCode !== 0) {
                console.error('❌ API tests failed with code:', testCode);
              } else {
                console.log('✅ API tests completed successfully!');
              }
              rl.question('\nWould you like to keep the server running? (y/n): ', (keepRunning) => {
                  if (keepRunning.toLowerCase() !== 'y') {
                      console.log('Shutting down server...');
                      // Kill the server process
                      if (process.platform === 'win32') {
                          spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
                        } else {
                            process.kill(-serverProcess.pid);
                        }
                        console.log('Server shut down. Exiting...');
                    } else {
                    
                  console.log('Server is still running. You can access it at http://127.0.0.1:' + 
                    (process.env.PORT || 9700));
                  console.log('Press Ctrl+C to stop the server when done.');
                }
                rl.close();
              });
            });
          }, 2000);
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Error]: ${data.toString().trim()}`);
      });
      
      // Set a timeout in case the server doesn't start properly
      const timeout = setTimeout(() => {
        if (!serverOutput.includes('server started on port')) {
          console.error('❌ Server failed to start within the expected time');
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
          } else {
            process.kill(-serverProcess.pid);
          }
          rl.close();
        }
      }, 30000); // 30 second timeout
      
      // Cleanup the timeout if the server starts successfully
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('server started on port')) {
          clearTimeout(timeout);
        }
      });
    });
  });
}); 