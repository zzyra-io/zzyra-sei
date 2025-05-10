#!/usr/bin/env node
/**
 * This script specifically fixes type conflicts in DeFi handler files
 * by commenting out local type definitions and ensuring proper imports
 */

const fs = require('fs');
const path = require('path');

// Config
const WORKER_DIR = path.resolve(__dirname, '../apps/zyra-worker');

// Specific files to target
const TARGET_FILES = [
  'PositionManagerHandler.ts',
  'ProtocolMonitorHandler.ts',
  'YieldStrategyHandler.ts',
  'RebalanceCalculatorHandler.ts',
  'GasOptimizerHandler.ts',
  'LiquidityProviderHandler.ts',
];

/**
 * Process a specific file's content
 */
function processFileContent(content, fileName) {
  let modified = false;
  
  // 1. Comment out "export type XConfig"
  if (/export\s+type\s+\w+Config\s*=/g.test(content)) {
    content = content.replace(
      /export\s+type\s+(\w+Config)\s*=/g, 
      '// @zyra/types: Local type definition commented out\n// export type $1 ='
    );
    modified = true;
  }
  
  // 2. Comment out "export const XConfigSchema"
  if (/export\s+const\s+\w+ConfigSchema\s*=/g.test(content)) {
    content = content.replace(
      /export\s+const\s+(\w+ConfigSchema)\s*=/g,
      '// @zyra/types: Local schema definition commented out\n// export const $1 ='
    );
    modified = true;
  }
  
  // 3. Make sure BlockType is properly imported 
  if (!content.includes('import { BlockType') && content.includes('BlockType.')) {
    // Add BlockType to an existing import from @zyra/types
    if (content.includes('from \'@zyra/types\'')) {
      content = content.replace(
        /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@zyra\/types['"]\s*;/,
        (match, imports) => {
          if (!imports.includes('BlockType')) {
            return `import { BlockType, ${imports} } from '@zyra/types';`;
          }
          return match;
        }
      );
    } else {
      // Add a new import
      content = `import { BlockType } from '@zyra/types';\n${content}`;
    }
    modified = true;
  }
  
  // 4. Fix class implementations
  if (/export\s+class\s+\w+Handler\s+implements\s+BlockHandler/.test(content)) {
    if (/private\s+async\s+startExecution/.test(content)) {
      // Change visibility of startExecution/completeExecution to public (if they're private)
      content = content.replace(
        /private\s+async\s+(startExecution|completeExecution|trackLog)/g,
        'public async $1'
      );
      modified = true;
    }
  }
  
  return { content, modified };
}

/**
 * Process a file to fix type conflicts
 */
function processFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    
    // Skip non-target files
    if (!TARGET_FILES.some(target => fileName.includes(target))) {
      return 0;
    }
    
    // Read file
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Process content
    const { content: newContent, modified } = processFileContent(content, fileName);
    
    // If changed, write back to file
    if (modified && newContent !== originalContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed DeFi handler: ${fileName}`);
      return 1;
    }
    
    return 0;
  } catch (err) {
    console.error(`❌ Error processing ${filePath}:`, err.message);
    return 0;
  }
}

/**
 * Process all TypeScript files in handlers directory
 */
function processHandlersDirectory() {
  const handlersDir = path.join(WORKER_DIR, 'src', 'workers', 'handlers');
  
  // Make sure directory exists
  if (!fs.existsSync(handlersDir)) {
    console.error(`❌ Handlers directory not found: ${handlersDir}`);
    return { updated: 0, total: 0 };
  }
  
  const files = fs.readdirSync(handlersDir);
  const count = { updated: 0, total: 0 };
  
  files.forEach(file => {
    const filePath = path.join(handlersDir, file);
    const stat = fs.statSync(filePath);
    
    if (!stat.isDirectory() && file.endsWith('.ts')) {
      count.total++;
      count.updated += processFile(filePath);
    }
  });
  
  return count;
}

// Main execution
console.log('🔍 Fixing DeFi handlers...');

const result = processHandlersDirectory();
console.log(`\n📊 Results: Fixed ${result.updated}/${result.total} files`);
console.log('\n✅ DeFi handlers fixed!');
