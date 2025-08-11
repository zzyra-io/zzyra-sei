#!/usr/bin/env node
/**
 * This script helps migrate local type imports to the shared @zzyra/types package
 * It scans source files and replaces imports of local types with imports from @zzyra/types
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Config
const UI_DIR = path.resolve(__dirname, '../apps/ui');
const WORKER_DIR = path.resolve(__dirname, '../apps/zzyra-worker');

// Type mapping - add more as needed
const TYPE_MAPPING = {
  'BlockType': '@zzyra/types',
  'BlockExecutionContext': '@zzyra/types',
  'LogEntry': '@zzyra/types',
  'BlockHandler': '@zzyra/types',
  'ProtocolMonitorConfig': '@zzyra/types',
  'PositionManagerConfig': '@zzyra/types',
  'YieldStrategyConfig': '@zzyra/types',
  'RebalanceCalculatorConfig': '@zzyra/types',
  'GasOptimizerConfig': '@zzyra/types',
};

// Schema mapping
const SCHEMA_MAPPING = {
  'ProtocolMonitorConfigSchema': '@zzyra/types',
  'PositionManagerConfigSchema': '@zzyra/types',
  'YieldStrategyConfigSchema': '@zzyra/types',
  'RebalanceCalculatorConfigSchema': '@zzyra/types',
  'GasOptimizerConfigSchema': '@zzyra/types',
};

/**
 * Process a single file to update imports
 */
function processFile(filePath) {
  // Read file
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Track what we need to import from @zzyra/types
  const typesToImport = new Set();
  
  // Check for type usages
  Object.keys(TYPE_MAPPING).forEach(type => {
    // Look for type usage that's not already from @zzyra/types
    if (content.includes(type) && 
        !content.includes(`import { ${type} } from '@zzyra/types'`) && 
        !content.includes(`import { ${type},`) && 
        !content.includes(`, ${type} } from '@zzyra/types'`) &&
        !content.includes(`, ${type},`)) {
      typesToImport.add(type);
    }
  });
  
  // Check for schema usages
  Object.keys(SCHEMA_MAPPING).forEach(schema => {
    if (content.includes(schema) && 
        !content.includes(`import { ${schema} } from '@zzyra/types'`) && 
        !content.includes(`import { ${schema},`) && 
        !content.includes(`, ${schema} } from '@zzyra/types'`) &&
        !content.includes(`, ${schema},`)) {
      typesToImport.add(schema);
    }
  });
  
  // If we found types to import
  if (typesToImport.size > 0) {
    const importStatement = `import { ${Array.from(typesToImport).join(', ')} } from '@zzyra/types';\n`;
    
    // Add import to top of file (after any other imports)
    const lines = content.split('\n');
    let lastImportLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportLine = i;
      }
    }
    
    if (lastImportLine >= 0) {
      lines.splice(lastImportLine + 1, 0, importStatement);
      content = lines.join('\n');
      modified = true;
    } else {
      // No imports found, add to top
      content = importStatement + content;
      modified = true;
    }
    
    // Look for import statements that import these types from elsewhere
    // and remove them or modify them
    // This is more complex and would need to be customized for your codebase
  }
  
  // If modified, write back to file
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated imports in ${filePath}`);
    return 1;
  }
  
  return 0;
}

/**
 * Process all TypeScript files in a directory recursively
 */
function processDirectory(dir, count = { updated: 0, total: 0 }) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.next' && file !== 'dist') {
      processDirectory(filePath, count);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      count.total++;
      count.updated += processFile(filePath);
    }
  });
  
  return count;
}

// Main execution
console.log('🔍 Scanning for files to update imports...');

const uiResult = processDirectory(UI_DIR);
console.log(`\n📊 UI Results: Updated ${uiResult.updated}/${uiResult.total} files`);

const workerResult = processDirectory(WORKER_DIR);
console.log(`\n📊 Worker Results: Updated ${workerResult.updated}/${workerResult.total} files`);

console.log(`\n🎉 Total: Updated ${uiResult.updated + workerResult.updated}/${uiResult.total + workerResult.total} files`);
console.log('\n⚠️ Note: This script only adds imports. You may need to update implementation details manually.');
console.log('Please review the MIGRATION.md guide for more details on full migration process.');
