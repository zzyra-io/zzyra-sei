#!/usr/bin/env node
/**
 * This script fixes BlockType references in the code
 * It replaces direct BlockType.XXX usage with proper imports
 */

const fs = require('fs');
const path = require('path');

// Config
const WORKER_DIR = path.resolve(__dirname, '../apps/zyra-worker');

// Pattern to detect uninported BlockType usage
const BLOCKTYPE_USAGE_REGEX = /const\s+blockType\s*=\s*BlockType\./g;

/**
 * Process a single file to fix BlockType references
 */
function processFile(filePath) {
  try {
    // Read file
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Check if we have BlockType usage but no import
    if (content.match(BLOCKTYPE_USAGE_REGEX) && 
        !content.includes('import { BlockType }') && 
        !content.includes('import { BlockType,')) {
      
      // Add import if not present
      if (!content.includes('from \'@zyra/types\'')) {
        content = 'import { BlockType } from \'@zyra/types\';\n' + content;
      } else {
        // Add BlockType to an existing import
        content = content.replace(
          /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@zyra\/types['"]\s*;/g,
          (match, importItems) => {
            if (!importItems.includes('BlockType')) {
              return `import { BlockType, ${importItems} } from '@zyra/types';`;
            }
            return match;
          }
        );
      }
      
      // If changed, write back to file
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed BlockType references in ${filePath}`);
        return 1;
      }
    }
    
    return 0;
  } catch (err) {
    console.error(`❌ Error processing ${filePath}:`, err.message);
    return 0;
  }
}

/**
 * Process all TypeScript files in a directory recursively
 */
function processDirectory(dir, count = { updated: 0, total: 0 }) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
      processDirectory(filePath, count);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      count.total++;
      count.updated += processFile(filePath);
    }
  });
  
  return count;
}

// Main execution
console.log('🔍 Fixing BlockType references in worker project...');

const result = processDirectory(WORKER_DIR);
console.log(`\n📊 Results: Fixed ${result.updated}/${result.total} files`);
console.log('\n✅ BlockType references fixed!');
