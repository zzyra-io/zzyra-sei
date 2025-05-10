#!/usr/bin/env node
/**
 * This script fixes type conflicts between local types and imported types
 * from @zyra/types package
 */

const fs = require('fs');
const path = require('path');

// Config
const WORKER_DIR = path.resolve(__dirname, '../apps/zyra-worker');

// Type conflicts to resolve
const CONFLICTING_TYPES = [
  'YieldStrategyConfig',
  'YieldStrategyConfigSchema',
  'PositionManagerConfig',
  'PositionManagerConfigSchema',
  'ProtocolMonitorConfig',
  'ProtocolMonitorConfigSchema',
  'RebalanceCalculatorConfig',
  'RebalanceCalculatorConfigSchema'
];

// Regex to find local type definitions
const TYPE_DEFINITION_REGEX = (type) => new RegExp(
  `(export\\s+(type|interface)\\s+${type}|export\\s+const\\s+${type}Schema)([^;]*?[{\\[])`
);

// Regex to find import of the type from @zyra/types
const TYPE_IMPORT_REGEX = (type) => new RegExp(
  `import\\s+\\{[^}]*?\\b${type}\\b.*?\\}\\s+from\\s+['"]@zyra\\/types['"]`
);

/**
 * Process a single file to fix type conflicts
 */
function processFile(filePath) {
  try {
    // Read file
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;
    
    // Check each conflicting type
    for (const type of CONFLICTING_TYPES) {
      // If file has both local definition and import
      if (content.match(TYPE_DEFINITION_REGEX(type)) && 
          (content.match(TYPE_IMPORT_REGEX(type)) || content.includes(`import { ${type}`) || content.includes(`, ${type} }`))) {
        
        // Comment out local definition to resolve conflict
        content = content.replace(
          TYPE_DEFINITION_REGEX(type),
          `// COMMENTED OUT FOR @zyra/types COMPATIBILITY\n// $1$3`
        );
        
        modified = true;
      }
    }
    
    // If file has a line importing BlockExecutionContext but no reference
    if (content.includes('import { BlockExecutionContext') && !content.includes('ctx: BlockExecutionContext')) {
      // This file probably imports but doesn't use BlockExecutionContext
      // Fix the import to prevent duplicate identifier errors
      content = content.replace(
        /import\s+\{\s*BlockExecutionContext\s*\}\s+from\s+['"][^'"]+['"]\s*;?/g,
        ''
      );
      content = content.replace(
        /import\s+\{\s*BlockExecutionContext,\s*/g,
        'import { '
      );
      modified = true;
    }
    
    // If changed, write back to file
    if (modified && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed type conflicts in ${filePath}`);
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
console.log('🔍 Fixing type conflicts in worker project...');

const result = processDirectory(WORKER_DIR);
console.log(`\n📊 Results: Fixed ${result.updated}/${result.total} files`);
console.log('\n✅ Type conflicts fixed!');
