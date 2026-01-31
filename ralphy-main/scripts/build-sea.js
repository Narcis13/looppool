#!/usr/bin/env node

/**
 * Build script to create a single executable application using Node.js SEA
 * Requires Node.js v20+ with SEA support
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, chmodSync, writeFileSync, statSync } from 'fs';
import { platform } from 'os';
import { join } from 'path';

const PLATFORM = platform();
const NODE_EXEC = process.execPath;
const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = join(PROJECT_ROOT, 'dist');
const SEA_CONFIG = join(PROJECT_ROOT, 'sea-config.json');

// Determine executable name based on platform
const getExecutableName = () => {
  switch (PLATFORM) {
    case 'win32':
      return 'lpl-ide.exe';
    case 'darwin':
      return 'lpl-ide-macos';
    case 'linux':
      return 'lpl-ide-linux';
    default:
      return 'lpl-ide';
  }
};

const EXECUTABLE_NAME = getExecutableName();

console.log('🔨 Building LPL IDE Single Executable Application...');
console.log(`Platform: ${PLATFORM}`);
console.log(`Node.js: ${process.version}`);
console.log(`Output: ${join(OUTPUT_DIR, EXECUTABLE_NAME)}`);

// Step 1: Create dist directory if it doesn't exist
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('✅ Created dist directory');
}

try {
  // Step 2: Generate the blob using Node.js built-in SEA support
  console.log('📦 Generating SEA blob...');
  execSync(`node --experimental-sea-config ${SEA_CONFIG}`, {
    stdio: 'inherit',
    cwd: PROJECT_ROOT
  });
  console.log('✅ SEA blob generated');

  // Step 3: Copy node executable to output directory
  const OUTPUT_PATH = join(OUTPUT_DIR, EXECUTABLE_NAME);
  console.log(`📋 Copying Node.js executable to ${EXECUTABLE_NAME}...`);
  copyFileSync(NODE_EXEC, OUTPUT_PATH);
  console.log('✅ Node.js executable copied');

  // Step 4: Make it executable on Unix-like systems
  if (PLATFORM !== 'win32') {
    chmodSync(OUTPUT_PATH, '755');
    console.log('✅ Made executable');
  }

  // Step 5: Inject the blob into the executable
  console.log('💉 Injecting SEA blob into executable...');
  
  if (PLATFORM === 'darwin') {
    // macOS: Use codesign to remove signature first
    try {
      execSync(`codesign --remove-signature ${OUTPUT_PATH}`, {
        stdio: 'inherit'
      });
    } catch (e) {
      // Ignore if no signature exists
    }
    
    // Inject using postject
    execSync(`npx postject ${OUTPUT_PATH} NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT
    });
    
    // Re-sign for macOS (ad-hoc signature)
    execSync(`codesign --sign - ${OUTPUT_PATH}`, {
      stdio: 'inherit'
    });
    
  } else if (PLATFORM === 'linux') {
    // Linux: Direct injection
    execSync(`npx postject ${OUTPUT_PATH} NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT
    });
    
  } else if (PLATFORM === 'win32') {
    // Windows: Use signtool if available, otherwise direct injection
    execSync(`npx postject ${OUTPUT_PATH} NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT
    });
  }
  
  console.log('✅ SEA blob injected successfully');

  // Step 6: Create a wrapper script for easier launching
  const wrapperContent = PLATFORM === 'win32' 
    ? `@echo off\n"%~dp0\\${EXECUTABLE_NAME}" %*` 
    : `#!/bin/sh\n"$(dirname "$0")/${EXECUTABLE_NAME}" "$@"`;
  
  const wrapperName = PLATFORM === 'win32' ? 'lpl-ide.bat' : 'lpl-ide';
  const wrapperPath = join(OUTPUT_DIR, wrapperName);
  
  writeFileSync(wrapperPath, wrapperContent);
  
  if (PLATFORM !== 'win32') {
    chmodSync(wrapperPath, '755');
  }
  
  console.log(`✅ Created wrapper script: ${wrapperName}`);

  // Final output
  console.log('\n🎉 Build completed successfully!');
  console.log(`\nExecutable location: ${OUTPUT_PATH}`);
  console.log(`Size: ${(statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2)} MB`);
  console.log('\nTo run the IDE:');
  console.log(`  ${OUTPUT_PATH}`);
  console.log('\nOr add dist/ to your PATH and run:');
  console.log(`  ${wrapperName}`);

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}