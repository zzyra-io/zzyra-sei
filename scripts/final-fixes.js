#!/usr/bin/env node
/**
 * This script applies the final fixes to resolve typescript errors:
 * 1. Comment out local type definitions completely
 * 2. Fix missing BlockExecutionContext imports
 * 3. Clean up duplicate imports
 */

const fs = require('fs');
const path = require('path');

// Config
const WORKER_DIR = path.resolve(__dirname, '../apps/zyra-worker');

// Handler files with type definition conflicts
const HANDLER_FILES = [
  'PositionManagerHandler.ts',
  'ProtocolMonitorHandler.ts',
  'YieldStrategyHandler.ts',
  'RebalanceCalculatorHandler.ts',
  'GasOptimizerHandler.ts'
];

// Files missing BlockExecutionContext
const FILES_MISSING_CONTEXT = [
  'MetricsBlockHandler.ts',
  'PortfolioBalanceHandler.ts',
  'DiscordBlockHandler.ts'
];

/**
 * Process a file to remove type definitions completely
 */
function fixTypeDefinitions(filePath, fileName) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Find all type definition blocks and comment them out
    const typeRegex = /(export\s+type\s+\w+Config\s*=[\s\S]*?};)/g;
    const schemaRegex = /(export\s+const\s+\w+ConfigSchema\s*=[\s\S]*?\)\s*;)/g;
    
    // Comment out type definitions
    content = content.replace(typeRegex, '// @zyra/types: Local type definition removed\n// $1');
    
    // Comment out schema definitions
    content = content.replace(schemaRegex, '// @zyra/types: Local schema definition removed\n// $1');
    
    // Fix imports
    if (content.includes('import {') && content.includes('from \'@zyra/types\'')) {
      // Remove conflicting imports
      content = content.replace(
        /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@zyra\/types['"]\s*;/g,
        (match, imports) => {
          const importParts = imports.split(',').map(part => part.trim());
          const filteredParts = importParts.filter(part => 
            !part.includes('Config') && part !== ''
          );
          
          if (filteredParts.length === 0) {
            return '// Import removed - conflicts resolved with @zyra/types';
          }
          
          return `import { ${filteredParts.join(', ')} } from '@zyra/types';`;
        }
      );
      
      // Add back BlockType and BlockExecutionContext
      if (!content.includes('BlockType') && !content.includes('BlockExecutionContext')) {
        content = `import { BlockType, BlockExecutionContext } from '@zyra/types';\n${content}`;
      } else if (!content.includes('BlockType')) {
        content = `import { BlockType } from '@zyra/types';\n${content}`;
      } else if (!content.includes('BlockExecutionContext')) {
        content = `import { BlockExecutionContext } from '@zyra/types';\n${content}`;
      }
    }
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed type definitions in ${fileName}`);
      return 1;
    }
    
    return 0;
  } catch (err) {
    console.error(`❌ Error fixing ${filePath}:`, err);
    return 0;
  }
}

/**
 * Fix files missing BlockExecutionContext
 */
function fixMissingContext(filePath, fileName) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Add import for BlockExecutionContext if not present
    if (content.includes('ctx: BlockExecutionContext') && !content.includes('import { BlockExecutionContext }')) {
      if (content.includes('from \'@zyra/types\'')) {
        // Add to existing import
        content = content.replace(
          /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@zyra\/types['"]\s*;/g,
          (match, imports) => {
            if (!imports.includes('BlockExecutionContext')) {
              return `import { BlockExecutionContext, ${imports} } from '@zyra/types';`;
            }
            return match;
          }
        );
      } else {
        // Add new import
        content = `import { BlockExecutionContext } from '@zyra/types';\n${content}`;
      }
    }
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed missing context in ${fileName}`);
      return 1;
    }
    
    return 0;
  } catch (err) {
    console.error(`❌ Error fixing ${filePath}:`, err);
    return 0;
  }
}

/**
 * Process the defi-block-handler.ts file to fix type issues
 */
function fixDefiBlockHandler(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix the reduce operation with unknown type
    if (content.includes('Object.values(currentBalances).reduce')) {
      content = content.replace(
        /Object\.values\(currentBalances\)\.reduce\(\(sum, balance\) => sum \+ Number\(balance\.value\), 0\);/g,
        'Object.values(currentBalances).reduce((sum, balance: any) => sum + Number(balance.value), 0);'
      );
      
      // Fix any other type errors
      content = content.replace(
        /const targetValue = totalValue \* targetWeights\[asset\];/g,
        'const targetValue = Number(totalValue) * targetWeights[asset];'
      );
      
      content = content.replace(
        /const currentValue = Number\(balance\.value\);/g,
        'const currentValue = Number((balance as any).value);'
      );
    }
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed defi-block-handler.ts`);
      return 1;
    }
    
    return 0;
  } catch (err) {
    console.error(`❌ Error fixing ${filePath}:`, err);
    return 0;
  }
}

// Main execution
console.log('🔍 Applying final fixes...');

// 1. Fix handler files with type definition conflicts
const handlersDir = path.join(WORKER_DIR, 'src', 'workers', 'handlers');
let fixedCount = 0;
let totalCount = 0;

HANDLER_FILES.forEach(fileName => {
  const filePath = path.join(handlersDir, fileName);
  if (fs.existsSync(filePath)) {
    totalCount++;
    fixedCount += fixTypeDefinitions(filePath, fileName);
  }
});

// 2. Fix files missing BlockExecutionContext
FILES_MISSING_CONTEXT.forEach(fileName => {
  const filePath = path.join(handlersDir, fileName);
  if (fs.existsSync(filePath)) {
    totalCount++;
    fixedCount += fixMissingContext(filePath, fileName);
  }
});

// 3. Fix defi-block-handler.ts
const defiHandlerPath = path.join(handlersDir, 'defi', 'defi-block-handler.ts');
if (fs.existsSync(defiHandlerPath)) {
  totalCount++;
  fixedCount += fixDefiBlockHandler(defiHandlerPath);
}

console.log(`\n📊 Results: Fixed ${fixedCount}/${totalCount} files`);
console.log('\n✅ Final fixes applied!');
