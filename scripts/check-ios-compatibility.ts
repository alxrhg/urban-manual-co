#!/usr/bin/env tsx

/**
 * iOS Compatibility Checker
 * 
 * This script checks the iOS setup and compatibility for the Urban Manual app.
 * It verifies:
 * - Capacitor configuration
 * - iOS project structure
 * - Dependencies
 * - Configuration files
 * - Build requirements
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface CompatibilityIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  fix?: string;
}

const issues: CompatibilityIssue[] = [];
const rootDir = process.cwd();

function addIssue(issue: CompatibilityIssue) {
  issues.push(issue);
}

function checkFileExists(path: string, description: string, required: boolean = true): boolean {
  const fullPath = join(rootDir, path);
  const exists = existsSync(fullPath);
  
  if (!exists) {
    addIssue({
      severity: required ? 'error' : 'warning',
      category: 'File System',
      message: `Missing ${description}: ${path}`,
      fix: required ? `Create the file: ${path}` : undefined
    });
  }
  
  return exists;
}

function checkCapacitorConfig() {
  console.log('\n📱 Checking Capacitor Configuration...');
  
  const configPath = 'capacitor.config.ts';
  if (checkFileExists(configPath, 'Capacitor config')) {
    try {
      const configContent = readFileSync(join(rootDir, configPath), 'utf-8');
      
      // Check for required fields
      if (!configContent.includes('appId')) {
        addIssue({
          severity: 'error',
          category: 'Capacitor Config',
          message: 'Missing appId in capacitor.config.ts',
          fix: 'Add appId field to capacitor.config.ts'
        });
      }
      
      if (!configContent.includes('appName')) {
        addIssue({
          severity: 'error',
          category: 'Capacitor Config',
          message: 'Missing appName in capacitor.config.ts',
          fix: 'Add appName field to capacitor.config.ts'
        });
      }
      
      if (!configContent.includes('webDir')) {
        addIssue({
          severity: 'error',
          category: 'Capacitor Config',
          message: 'Missing webDir in capacitor.config.ts',
          fix: 'Add webDir field to capacitor.config.ts'
        });
      }
      
      // Check iOS specific config
      if (configContent.includes('ios:')) {
        console.log('  ✅ iOS configuration section found');
      } else {
        addIssue({
          severity: 'info',
          category: 'Capacitor Config',
          message: 'No iOS-specific configuration found',
          fix: 'Consider adding ios-specific settings like contentInset, backgroundColor'
        });
      }
      
    } catch (error) {
      addIssue({
        severity: 'error',
        category: 'Capacitor Config',
        message: `Error reading capacitor.config.ts: ${error}`,
      });
    }
  }
}

function checkIOSProject() {
  console.log('\n🍎 Checking iOS Project Structure...');
  
  // Check for iOS directory
  if (!checkFileExists('ios', 'iOS directory')) {
    return;
  }
  
  // Check for Xcode project
  checkFileExists('ios/App/App.xcodeproj', 'Xcode project');
  checkFileExists('ios/App/App.xcworkspace', 'Xcode workspace');
  
  // Check for essential iOS files
  checkFileExists('ios/App/Podfile', 'Podfile');
  checkFileExists('ios/App/App/Info.plist', 'Info.plist');
  checkFileExists('ios/App/App/AppDelegate.swift', 'AppDelegate.swift');
  
  // Check Podfile content
  const podfilePath = join(rootDir, 'ios/App/Podfile');
  if (existsSync(podfilePath)) {
    try {
      const podfileContent = readFileSync(podfilePath, 'utf-8');
      
      // Check minimum iOS version
      const platformMatch = podfileContent.match(/platform\s+:ios,\s+'([^']+)'/);
      if (platformMatch) {
        const iosVersion = platformMatch[1];
        console.log(`  ℹ️  Minimum iOS version: ${iosVersion}`);
        
        const version = parseFloat(iosVersion);
        if (version < 13.0) {
          addIssue({
            severity: 'warning',
            category: 'iOS Version',
            message: `iOS minimum version ${iosVersion} is quite old`,
            fix: 'Consider updating to iOS 13.0+ for better compatibility'
          });
        }
      }
      
      // Check for Capacitor pods
      if (podfileContent.includes('CapacitorApp')) {
        console.log('  ✅ Capacitor App plugin configured');
      }
      if (podfileContent.includes('CapacitorStatusBar')) {
        console.log('  ✅ Capacitor StatusBar plugin configured');
      }
      if (podfileContent.includes('CapacitorSplashScreen')) {
        console.log('  ✅ Capacitor SplashScreen plugin configured');
      }
      
    } catch (error) {
      addIssue({
        severity: 'error',
        category: 'Podfile',
        message: `Error reading Podfile: ${error}`,
      });
    }
  }
  
  // Check Info.plist
  const infoPlistPath = join(rootDir, 'ios/App/App/Info.plist');
  if (existsSync(infoPlistPath)) {
    try {
      const plistContent = readFileSync(infoPlistPath, 'utf-8');
      
      // Check for essential keys
      if (!plistContent.includes('CFBundleDisplayName')) {
        addIssue({
          severity: 'warning',
          category: 'Info.plist',
          message: 'Missing CFBundleDisplayName',
        });
      }
      
      if (!plistContent.includes('CFBundleIdentifier')) {
        addIssue({
          severity: 'error',
          category: 'Info.plist',
          message: 'Missing CFBundleIdentifier',
        });
      }
      
      // Check for permissions if needed
      if (!plistContent.includes('NSLocationWhenInUseUsageDescription') && 
          plistContent.includes('Location')) {
        addIssue({
          severity: 'info',
          category: 'Info.plist',
          message: 'Location permission description not found',
          fix: 'Add NSLocationWhenInUseUsageDescription if app uses location services'
        });
      }
      
      console.log('  ✅ Info.plist structure looks valid');
      
    } catch (error) {
      addIssue({
        severity: 'error',
        category: 'Info.plist',
        message: `Error reading Info.plist: ${error}`,
      });
    }
  }
}

function checkCapacitorDependencies() {
  console.log('\n📦 Checking Capacitor Dependencies...');
  
  const packageJsonPath = join(rootDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    addIssue({
      severity: 'error',
      category: 'Dependencies',
      message: 'package.json not found',
    });
    return;
  }
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    // Check for Capacitor packages
    const capacitorPackages = [
      '@capacitor/cli',
      '@capacitor/core',
      '@capacitor/ios',
      '@capacitor/app',
      '@capacitor/haptics',
      '@capacitor/keyboard',
      '@capacitor/splash-screen',
      '@capacitor/status-bar'
    ];
    
    const missingPackages: string[] = [];
    const installedPackages: string[] = [];
    
    capacitorPackages.forEach(pkg => {
      if (allDeps[pkg]) {
        installedPackages.push(`${pkg}@${allDeps[pkg]}`);
        console.log(`  ✅ ${pkg} (${allDeps[pkg]})`);
      } else {
        missingPackages.push(pkg);
      }
    });
    
    if (missingPackages.length > 0) {
      addIssue({
        severity: 'warning',
        category: 'Dependencies',
        message: `Missing Capacitor packages: ${missingPackages.join(', ')}`,
        fix: `Install with: npm install ${missingPackages.join(' ')}`
      });
    }
    
    if (installedPackages.length === 0) {
      addIssue({
        severity: 'error',
        category: 'Dependencies',
        message: 'No Capacitor packages found in package.json',
        fix: 'Install Capacitor: npm install @capacitor/core @capacitor/cli @capacitor/ios'
      });
    }
    
  } catch (error) {
    addIssue({
      severity: 'error',
      category: 'Dependencies',
      message: `Error reading package.json: ${error}`,
    });
  }
}

function checkNativeSwiftApp() {
  console.log('\n🦅 Checking Native Swift App (ios-app)...');
  
  const swiftAppDir = 'ios-app/UrbanManual';
  if (!existsSync(join(rootDir, swiftAppDir))) {
    console.log('  ℹ️  No native Swift app directory found (optional)');
    return;
  }
  
  console.log('  ✅ Native Swift app directory exists');
  
  // Check for essential Swift files
  const swiftFiles = [
    'Models/Destination.swift',
    'Models/User.swift',
    'ViewModels/Auth/AuthViewModel.swift',
    'Views/MainTabView.swift',
    'Core/Config/SupabaseConfig.swift'
  ];
  
  let foundFiles = 0;
  swiftFiles.forEach(file => {
    const fullPath = join(swiftAppDir, file);
    if (checkFileExists(fullPath, `Swift file ${file}`, false)) {
      foundFiles++;
    }
  });
  
  if (foundFiles > 0) {
    console.log(`  ✅ Found ${foundFiles}/${swiftFiles.length} expected Swift files`);
    
    addIssue({
      severity: 'info',
      category: 'Native Swift App',
      message: 'Native SwiftUI app structure found',
      fix: 'See ios-app/UrbanManual/README.md for setup instructions'
    });
  }
}

function checkBuildOutput() {
  console.log('\n🏗️  Checking Build Output...');
  
  const capacitorConfigPath = join(rootDir, 'capacitor.config.ts');
  if (!existsSync(capacitorConfigPath)) {
    return;
  }
  
  try {
    const configContent = readFileSync(capacitorConfigPath, 'utf-8');
    const webDirMatch = configContent.match(/webDir:\s*['"]([^'"]+)['"]/);
    
    if (webDirMatch) {
      const webDir = webDirMatch[1];
      console.log(`  ℹ️  Web directory: ${webDir}`);
      
      if (!existsSync(join(rootDir, webDir))) {
        addIssue({
          severity: 'warning',
          category: 'Build Output',
          message: `Web directory '${webDir}' does not exist`,
          fix: 'Run the build command to generate web assets (e.g., npm run build)'
        });
      } else {
        console.log(`  ✅ Web directory exists`);
        
        // Check for index.html
        if (existsSync(join(rootDir, webDir, 'index.html'))) {
          console.log(`  ✅ index.html found in web directory`);
        } else {
          addIssue({
            severity: 'error',
            category: 'Build Output',
            message: `No index.html found in ${webDir}`,
            fix: 'Ensure your build produces an index.html file'
          });
        }
      }
    }
  } catch (error) {
    addIssue({
      severity: 'warning',
      category: 'Build Output',
      message: `Error checking build output: ${error}`,
    });
  }
}

function checkSystemRequirements() {
  console.log('\n💻 Checking System Requirements...');
  
  // Note: These checks will only work on macOS with the required tools installed
  const checks = [
    { cmd: 'xcodebuild -version', name: 'Xcode', optional: true },
    { cmd: 'pod --version', name: 'CocoaPods', optional: true },
    { cmd: 'node --version', name: 'Node.js', optional: false },
    { cmd: 'npm --version', name: 'npm', optional: false }
  ];
  
  checks.forEach(({ cmd, name, optional }) => {
    try {
      const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
      console.log(`  ✅ ${name}: ${output.split('\n')[0]}`);
    } catch (error) {
      if (optional) {
        console.log(`  ℹ️  ${name}: Not available (required for iOS development on macOS)`);
      } else {
        addIssue({
          severity: 'error',
          category: 'System Requirements',
          message: `${name} is not installed`,
          fix: `Install ${name} to continue`
        });
      }
    }
  });
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 iOS COMPATIBILITY CHECK SUMMARY');
  console.log('='.repeat(60));
  
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info = issues.filter(i => i.severity === 'info');
  
  console.log(`\n✅ Checks completed`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`ℹ️  Info: ${info.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS (Must Fix):');
    errors.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.category}] ${issue.message}`);
      if (issue.fix) {
        console.log(`   Fix: ${issue.fix}`);
      }
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Recommended):');
    warnings.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.category}] ${issue.message}`);
      if (issue.fix) {
        console.log(`   Fix: ${issue.fix}`);
      }
    });
  }
  
  if (info.length > 0) {
    console.log('\nℹ️  INFORMATION:');
    info.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.category}] ${issue.message}`);
      if (issue.fix) {
        console.log(`   Note: ${issue.fix}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ iOS setup looks good! Ready for development.');
  } else if (errors.length === 0) {
    console.log('✅ No critical errors, but please review warnings.');
  } else {
    console.log('❌ Please fix errors before proceeding with iOS development.');
  }
  
  console.log('='.repeat(60) + '\n');
  
  // Return exit code
  return errors.length > 0 ? 1 : 0;
}

// Main execution
async function main() {
  console.log('🔍 Starting iOS Compatibility Check...\n');
  
  checkSystemRequirements();
  checkCapacitorConfig();
  checkCapacitorDependencies();
  checkIOSProject();
  checkBuildOutput();
  checkNativeSwiftApp();
  
  const exitCode = printSummary();
  process.exit(exitCode);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
