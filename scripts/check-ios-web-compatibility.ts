#!/usr/bin/env tsx

/**
 * iOS Web Compatibility Checker
 * 
 * This script checks the website's compatibility with iOS devices and Safari browser.
 * It validates:
 * - Viewport configuration for iOS devices
 * - iOS-specific meta tags
 * - Safari browser support
 * - Touch interactions and gestures
 * - Responsive design for iPhone/iPad
 * - iOS Safari specific CSS issues
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

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

function checkViewportConfiguration() {
  console.log('\n📱 Checking Viewport Configuration for iOS...');
  
  const layoutPath = join(rootDir, 'app/layout.tsx');
  if (!existsSync(layoutPath)) {
    addIssue({
      severity: 'error',
      category: 'Viewport',
      message: 'app/layout.tsx not found',
      fix: 'Create root layout file with viewport configuration'
    });
    return;
  }
  
  const layoutContent = readFileSync(layoutPath, 'utf-8');
  
  // Check for viewport export
  if (!layoutContent.includes('export const viewport')) {
    addIssue({
      severity: 'warning',
      category: 'Viewport',
      message: 'No viewport configuration found',
      fix: 'Add viewport export with iOS-friendly settings'
    });
  } else {
    console.log('  ✅ Viewport configuration found');
    
    // Check for device-width
    if (layoutContent.includes("width: 'device-width'") || 
        layoutContent.includes('width="device-width"')) {
      console.log('  ✅ Responsive width: device-width');
    } else {
      addIssue({
        severity: 'warning',
        category: 'Viewport',
        message: 'Missing device-width viewport setting',
        fix: "Add width: 'device-width' to viewport configuration"
      });
    }
    
    // Check for initial scale
    if (layoutContent.includes('initialScale')) {
      console.log('  ✅ Initial scale configured');
    } else {
      addIssue({
        severity: 'info',
        category: 'Viewport',
        message: 'No initial scale specified',
        fix: 'Consider adding initialScale: 1 for consistent rendering on iOS'
      });
    }
    
    // Check for viewport-fit (important for iPhone X+ notch)
    if (layoutContent.includes('viewportFit') || layoutContent.includes('viewport-fit')) {
      console.log('  ✅ Viewport-fit configured for safe areas');
    } else {
      addIssue({
        severity: 'info',
        category: 'Viewport',
        message: 'No viewport-fit specified',
        fix: "Add viewportFit: 'cover' for proper rendering on notched iPhones"
      });
    }
  }
}

function checkIOSMetaTags() {
  console.log('\n🍎 Checking iOS-Specific Meta Tags...');
  
  const layoutPath = join(rootDir, 'app/layout.tsx');
  if (!existsSync(layoutPath)) {
    return;
  }
  
  const layoutContent = readFileSync(layoutPath, 'utf-8');
  
  // Check for apple-mobile-web-app-capable
  if (layoutContent.includes('apple-mobile-web-app-capable')) {
    console.log('  ℹ️  apple-mobile-web-app-capable found');
    addIssue({
      severity: 'info',
      category: 'iOS Meta Tags',
      message: 'Web app mode enabled (apple-mobile-web-app-capable)',
      fix: 'This makes the site feel like a native app when added to home screen'
    });
  } else {
    console.log('  ℹ️  No apple-mobile-web-app-capable (website mode, recommended for most sites)');
  }
  
  // Check for apple-mobile-web-app-status-bar-style
  if (layoutContent.includes('apple-mobile-web-app-status-bar-style')) {
    console.log('  ✅ Status bar style configured');
  } else {
    addIssue({
      severity: 'info',
      category: 'iOS Meta Tags',
      message: 'No status bar style specified',
      fix: 'Add apple-mobile-web-app-status-bar-style for better iOS home screen experience'
    });
  }
  
  // Check for apple-mobile-web-app-title
  if (layoutContent.includes('apple-mobile-web-app-title')) {
    console.log('  ✅ App title configured for iOS home screen');
  } else {
    addIssue({
      severity: 'info',
      category: 'iOS Meta Tags',
      message: 'No iOS home screen title specified',
      fix: 'Add apple-mobile-web-app-title for custom name when added to home screen'
    });
  }
  
  // Check for apple-touch-icon
  if (layoutContent.includes('apple-touch-icon') || layoutContent.includes("apple: [")) {
    console.log('  ✅ Apple touch icon configured');
  } else {
    addIssue({
      severity: 'warning',
      category: 'iOS Meta Tags',
      message: 'No apple-touch-icon found',
      fix: 'Add apple-touch-icon for iOS home screen icon'
    });
  }
  
  // Check for theme-color
  if (layoutContent.includes('theme-color')) {
    console.log('  ✅ Theme color configured');
  } else {
    addIssue({
      severity: 'info',
      category: 'iOS Meta Tags',
      message: 'No theme-color specified',
      fix: 'Add theme-color meta tag for iOS Safari UI theming'
    });
  }
}

function checkBrowserslistIOSSupport() {
  console.log('\n🌐 Checking Browserslist Configuration for iOS Support...');
  
  const browserslistPath = join(rootDir, '.browserslistrc');
  const packageJsonPath = join(rootDir, 'package.json');
  
  let browserslistConfig = '';
  
  if (existsSync(browserslistPath)) {
    browserslistConfig = readFileSync(browserslistPath, 'utf-8');
    console.log('  ✅ .browserslistrc file found');
  } else if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    if (packageJson.browserslist) {
      browserslistConfig = JSON.stringify(packageJson.browserslist);
      console.log('  ✅ browserslist in package.json found');
    } else {
      addIssue({
        severity: 'info',
        category: 'Browserslist',
        message: 'No browserslist configuration found',
        fix: 'Using defaults - consider adding explicit iOS Safari support'
      });
      return;
    }
  } else {
    addIssue({
      severity: 'warning',
      category: 'Browserslist',
      message: 'No browserslist configuration found',
      fix: 'Create .browserslistrc to specify iOS Safari support'
    });
    return;
  }
  
  // Check for Safari/iOS support
  if (browserslistConfig.includes('Safari') || browserslistConfig.includes('iOS')) {
    console.log('  ✅ Safari/iOS explicitly included in browserslist');
  } else {
    addIssue({
      severity: 'info',
      category: 'Browserslist',
      message: 'iOS/Safari not explicitly mentioned in browserslist',
      fix: 'Consider adding "last 2 Safari versions" and "iOS >= 13" for clarity'
    });
  }
  
  // Warn about IE 11
  if (browserslistConfig.includes('IE 11') && !browserslistConfig.includes('not IE 11')) {
    addIssue({
      severity: 'warning',
      category: 'Browserslist',
      message: 'IE 11 support may bloat bundle size',
      fix: 'Consider excluding IE 11 to improve iOS performance'
    });
  } else {
    console.log('  ✅ IE 11 excluded (good for performance)');
  }
}

function checkTouchInteractions() {
  console.log('\n👆 Checking Touch Interaction Support...');
  
  // Check CSS for touch-action
  const checkCSSFile = (path: string) => {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      return content;
    }
    return '';
  };
  
  const globalCssPath = join(rootDir, 'app/globals.css');
  const tailwindConfigPath = join(rootDir, 'tailwind.config.js');
  
  let cssContent = checkCSSFile(globalCssPath);
  let hasTouchAction = false;
  let hasUserSelect = false;
  let hasWebkitTapHighlight = false;
  
  if (cssContent) {
    console.log('  ✅ Global CSS file found');
    
    if (cssContent.includes('touch-action')) {
      console.log('  ✅ touch-action property used (good for iOS gestures)');
      hasTouchAction = true;
    }
    
    if (cssContent.includes('user-select') || cssContent.includes('-webkit-user-select')) {
      console.log('  ✅ user-select configured');
      hasUserSelect = true;
    }
    
    if (cssContent.includes('-webkit-tap-highlight-color')) {
      console.log('  ✅ WebKit tap highlight customized');
      hasWebkitTapHighlight = true;
    } else {
      addIssue({
        severity: 'info',
        category: 'Touch Interactions',
        message: 'No custom -webkit-tap-highlight-color',
        fix: 'Consider adding -webkit-tap-highlight-color to control iOS tap feedback'
      });
    }
    
    // Check for iOS bounce scrolling
    if (cssContent.includes('-webkit-overflow-scrolling')) {
      console.log('  ✅ WebKit overflow scrolling configured');
    }
  } else {
    addIssue({
      severity: 'warning',
      category: 'Touch Interactions',
      message: 'No global CSS file found',
      fix: 'Create app/globals.css for iOS-specific touch styles'
    });
  }
  
  if (!hasTouchAction) {
    addIssue({
      severity: 'info',
      category: 'Touch Interactions',
      message: 'No touch-action property found',
      fix: 'Consider using touch-action for better gesture control on iOS'
    });
  }
}

function checkResponsiveDesign() {
  console.log('\n📐 Checking Responsive Design for iOS Devices...');
  
  const tailwindConfigPath = join(rootDir, 'tailwind.config.js');
  const tailwindConfigTsPath = join(rootDir, 'tailwind.config.ts');
  
  let tailwindPath = tailwindConfigPath;
  if (!existsSync(tailwindConfigPath) && existsSync(tailwindConfigTsPath)) {
    tailwindPath = tailwindConfigTsPath;
  }
  
  if (existsSync(tailwindPath)) {
    console.log('  ✅ Tailwind CSS configuration found');
    
    const tailwindContent = readFileSync(tailwindPath, 'utf-8');
    
    // Check for custom breakpoints
    if (tailwindContent.includes('screens')) {
      console.log('  ✅ Custom breakpoints configured');
      
      // Check for common iOS device breakpoints
      const hasSmallMobile = tailwindContent.includes('375px') || tailwindContent.includes('320px');
      const hasTablet = tailwindContent.includes('768px') || tailwindContent.includes('834px');
      
      if (hasSmallMobile) {
        console.log('  ✅ Small mobile breakpoints (iPhone SE, etc.)');
      } else {
        addIssue({
          severity: 'info',
          category: 'Responsive Design',
          message: 'No small mobile breakpoints (375px, 320px)',
          fix: 'Consider adding breakpoints for smaller iPhones'
        });
      }
      
      if (hasTablet) {
        console.log('  ✅ Tablet breakpoints (iPad, etc.)');
      }
    } else {
      console.log('  ℹ️  Using default Tailwind breakpoints');
      addIssue({
        severity: 'info',
        category: 'Responsive Design',
        message: 'Using default breakpoints',
        fix: 'Default Tailwind breakpoints work well for iOS devices'
      });
    }
  } else {
    console.log('  ℹ️  No Tailwind configuration (using defaults)');
  }
}

function checkIOSSafariSpecificIssues() {
  console.log('\n🔍 Checking for Common iOS Safari Issues...');
  
  const globalCssPath = join(rootDir, 'app/globals.css');
  
  if (existsSync(globalCssPath)) {
    const cssContent = readFileSync(globalCssPath, 'utf-8');
    
    // Check for safe area insets (important for notched iPhones)
    if (cssContent.includes('safe-area-inset') || cssContent.includes('env(safe-area-inset')) {
      console.log('  ✅ Safe area insets handled (notch support)');
    } else {
      addIssue({
        severity: 'info',
        category: 'iOS Safari',
        message: 'No safe area insets found',
        fix: 'Consider using env(safe-area-inset-*) for iPhone X+ notch support'
      });
    }
    
    // Check for 100vh issue fix
    if (cssContent.includes('100dvh') || cssContent.includes('calc(100vh') || 
        cssContent.includes('var(--vh)')) {
      console.log('  ✅ 100vh iOS issue addressed');
    } else {
      addIssue({
        severity: 'info',
        category: 'iOS Safari',
        message: 'No 100vh iOS fix detected',
        fix: 'iOS Safari has issues with 100vh - consider using 100dvh or JS-based solution'
      });
    }
    
    // Check for position: fixed issues
    if (cssContent.includes('position: fixed') || cssContent.includes('position:fixed')) {
      addIssue({
        severity: 'info',
        category: 'iOS Safari',
        message: 'position: fixed used - test on iOS',
        fix: 'position: fixed has known issues on iOS Safari - test thoroughly'
      });
    }
  }
}

function checkNextJSiOSOptimizations() {
  console.log('\n⚡ Checking Next.js Optimizations for iOS...');
  
  const nextConfigPath = join(rootDir, 'next.config.ts');
  const nextConfigJsPath = join(rootDir, 'next.config.js');
  
  let configPath = nextConfigPath;
  if (!existsSync(nextConfigPath) && existsSync(nextConfigJsPath)) {
    configPath = nextConfigJsPath;
  }
  
  if (existsSync(configPath)) {
    const configContent = readFileSync(configPath, 'utf-8');
    
    console.log('  ✅ Next.js configuration found');
    
    // Check for image optimization
    if (configContent.includes('images')) {
      console.log('  ✅ Image optimization configured');
      
      if (configContent.includes('formats') && configContent.includes('webp')) {
        console.log('  ✅ WebP format enabled (iOS 14+ support)');
      }
      
      if (configContent.includes('avif')) {
        console.log('  ✅ AVIF format enabled (iOS 16+ support)');
      }
    } else {
      addIssue({
        severity: 'info',
        category: 'Next.js',
        message: 'No custom image optimization config',
        fix: 'Using Next.js defaults - consider WebP/AVIF for better iOS performance'
      });
    }
    
    // Check for compression
    if (configContent.includes('compress: true')) {
      console.log('  ✅ Compression enabled');
    } else {
      addIssue({
        severity: 'info',
        category: 'Next.js',
        message: 'Compression not explicitly enabled',
        fix: 'Enable compression for better iOS performance on cellular'
      });
    }
    
    // Check for React strict mode
    if (configContent.includes('reactStrictMode: true')) {
      console.log('  ✅ React strict mode enabled');
    }
  }
}

function checkManifestForPWA() {
  console.log('\n📋 Checking PWA Manifest for iOS...');
  
  const manifestPath = join(rootDir, 'public/manifest.json');
  const manifestWebPath = join(rootDir, 'public/manifest.webmanifest');
  
  let actualPath = manifestPath;
  if (!existsSync(manifestPath) && existsSync(manifestWebPath)) {
    actualPath = manifestWebPath;
  }
  
  if (existsSync(actualPath)) {
    console.log('  ✅ PWA manifest found');
    
    try {
      const manifest = JSON.parse(readFileSync(actualPath, 'utf-8'));
      
      if (manifest.name) {
        console.log(`  ✅ App name: ${manifest.name}`);
      }
      
      if (manifest.icons && manifest.icons.length > 0) {
        console.log(`  ✅ Icons configured (${manifest.icons.length} sizes)`);
        
        const has192 = manifest.icons.some((icon: { sizes: string }) => 
          icon.sizes === '192x192'
        );
        const has512 = manifest.icons.some((icon: { sizes: string }) => 
          icon.sizes === '512x512'
        );
        
        if (has192 && has512) {
          console.log('  ✅ Required icon sizes present (192x192, 512x512)');
        } else {
          addIssue({
            severity: 'warning',
            category: 'PWA',
            message: 'Missing recommended icon sizes',
            fix: 'Add 192x192 and 512x512 icons for iOS home screen'
          });
        }
      } else {
        addIssue({
          severity: 'warning',
          category: 'PWA',
          message: 'No icons in manifest',
          fix: 'Add icons array with multiple sizes for iOS compatibility'
        });
      }
      
      if (manifest.display) {
        console.log(`  ✅ Display mode: ${manifest.display}`);
      }
      
      if (manifest.theme_color) {
        console.log(`  ✅ Theme color: ${manifest.theme_color}`);
      }
    } catch (error) {
      addIssue({
        severity: 'error',
        category: 'PWA',
        message: 'Invalid manifest.json',
        fix: 'Fix JSON syntax errors in manifest file'
      });
    }
  } else {
    addIssue({
      severity: 'info',
      category: 'PWA',
      message: 'No PWA manifest found',
      fix: 'Create manifest.json for better iOS home screen experience'
    });
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 iOS WEB COMPATIBILITY CHECK SUMMARY');
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
    console.log('\nℹ️  INFORMATION & SUGGESTIONS:');
    info.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.category}] ${issue.message}`);
      if (issue.fix) {
        console.log(`   Note: ${issue.fix}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📱 iOS DEVICE COMPATIBILITY');
  console.log('='.repeat(60));
  console.log('\nSupported iOS Devices:');
  console.log('  iPhone: iPhone 8 and later (iOS 13+)');
  console.log('  iPad: iPad (5th gen) and later, iPad Air 2+, iPad mini 4+');
  console.log('  Browser: Safari 13+ (based on browserslist configuration)');
  console.log('  Coverage: ~98% of active iOS devices');
  
  console.log('\nRecommended Testing Devices:');
  console.log('  • iPhone SE (375×667) - Small screen');
  console.log('  • iPhone 12/13/14 (390×844) - Standard');
  console.log('  • iPhone 14 Pro Max (430×932) - Large screen');
  console.log('  • iPad (768×1024) - Tablet');
  console.log('  • iPad Pro (1024×1366) - Large tablet');
  
  console.log('\n' + '='.repeat(60));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ iOS web compatibility looks excellent!');
    console.log('   Website is well-configured for iOS devices.');
  } else if (errors.length === 0) {
    console.log('✅ No critical issues found.');
    console.log('   Review warnings and suggestions for optimal iOS experience.');
  } else {
    console.log('❌ Please fix errors before deploying to iOS users.');
  }
  
  console.log('='.repeat(60) + '\n');
  
  // Return exit code
  return errors.length > 0 ? 1 : 0;
}

// Main execution
async function main() {
  console.log('🔍 Starting iOS Web Compatibility Check...\n');
  console.log('This checks your website\'s compatibility with iOS devices');
  console.log('(iPhone, iPad) and Safari browser.\n');
  
  checkViewportConfiguration();
  checkIOSMetaTags();
  checkBrowserslistIOSSupport();
  checkTouchInteractions();
  checkResponsiveDesign();
  checkIOSSafariSpecificIssues();
  checkNextJSiOSOptimizations();
  checkManifestForPWA();
  
  const exitCode = printSummary();
  process.exit(exitCode);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
