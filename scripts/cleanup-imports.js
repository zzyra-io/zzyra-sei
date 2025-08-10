#!/usr/bin/env node
/**
 * This script cleans up duplicate imports by removing local imports
 * in favor of the shared @zzyra/types package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Config
const WORKER_DIR = path.resolve(__dirname, '../apps/zzyra-worker');

// Types to replace
const TYPES_TO_REPLACE = [
  'BlockType',
  'BlockExecutionContext',
  'BlockHandler'
];

// Imports to remove - regex patterns that match import statements to remove
const IMPORTS_TO_REMOVE = [
  /import\s+\{\s*BlockType\s*\}\s+from\s+['"]\.\.\/\.\.\/types\/workflow['"]\s*;?/g,
  /import\s+\{\s*BlockExecutionContext\s*\}\s+from\s+['"]\.\.\/\.\.\/types\/workflow['"]\s*;?/g,
  /import\s+\{\s*BlockExecutionContext\s*\}\s+from\s+['"]@\/types\/workflow['"]\s*;?/g,
  /import\s+\{\s*BlockType,\s*BlockExecutionContext\s*\}\s+from\s+['"]\.\.\/\.\.\/types\/workflow['"]\s*;?/g,
  /import\s+\{\s*BlockHandler\s*\}\s+from\s+['"]\.\/(B|b)lockHandler['"]\s*;?/g
];

// Complex import with multiple types
const COMPLEX_IMPORT_REGEX = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]\s*;?/g;

/**
 * Process a single file to clean up imports
 */
function processFile(filePath) {
  try {
    // Read file
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // 1. Remove simple imports that match patterns exactly
    IMPORTS_TO_REMOVE.forEach(regex => {
      content = content.replace(regex, '');
    });
    
    // 2. Process complex imports with multiple items
    let complexImportsFound = false;
    content = content.replace(COMPLEX_IMPORT_REGEX, (match, importItems, importPath) => {
      // Only process imports from local workflow types
      if (importPath.includes('types/workflow') || importPath.endsWith('BlockHandler')) {
        complexImportsFound = true;
        
        // Parse the import items, trim whitespace
        const items = importItems.split(',').map(item => item.trim());
        
        // Filter out items that are now imported from @zzyra/types
        const remainingItems = items.filter(item => !TYPES_TO_REPLACE.includes(item));
        
        // If all items were removed, remove the entire import
        if (remainingItems.length === 0) {
          return '';
        }
        
        // Otherwise, reconstruct the import with remaining items
        return `import { ${remainingItems.join(', ')} } from '${importPath}';`;
      }
      
      // If not a workflow types import, leave it unchanged
      return match;
    });
    
    // 3. Make sure we have the @zzyra/types import
    if (!content.includes('@zzyra/types') && TYPES_TO_REPLACE.some(type => content.includes(type))) {
      // Find what types are used in the file
      const typesUsed = TYPES_TO_REPLACE.filter(type => content.includes(type));
      
      // Add the import at the top
      content = `import { ${typesUsed.join(', ')} } from '@zzyra/types';\n${content}`;
    }
    
    // If changed, write back to file
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Cleaned up imports in ${filePath}`);
      return 1;
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
console.log('🔍 Cleaning up duplicate imports in worker project...');

const result = processDirectory(WORKER_DIR);
console.log(`\n📊 Results: Cleaned up ${result.updated}/${result.total} files`);
console.log('\n✅ Import cleanup complete!');
