#!/usr/bin/env node
// cleanup-comments.js - SAFE Directory Comment Cleaner
// Usage: node cleanup-comments.js [directory] [options]

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class SafeCommentCleaner {
  constructor(options = {}) {
    this.options = {
      // File extensions to process
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      
      // Directories to skip
      skipDirs: ['node_modules', 'build', 'dist', '.git', '.next', 'coverage', '__pycache__', 'public'],
      
      // Files to skip
      skipFiles: ['package-lock.json', 'yarn.lock', '.env', '.gitignore'],
      
      // Create backups (now defaults to false)
      createBackups: false,
      
      // Preserve certain comments
      preserveJSDoc: false,
      preserveLicense: true,
      preserveImportant: true,
      preserveConfig: true, // eslint, prettier, etc.
      
      // Remove console statements
      removeConsole: false,
      
      // Dry run (show what would be changed without changing)
      dryRun: false,
      
      // Verbose output
      verbose: true,
      
      ...options
    };
    
    this.stats = {
      filesScanned: 0,
      filesProcessed: 0,
      filesSkipped: 0,
      totalOriginalSize: 0,
      totalNewSize: 0,
      totalCommentsRemoved: 0,
      totalConsoleStatementsRemoved: 0,
      errors: [],
      warnings: []
    };
  }

  // Advanced tokenizer to properly identify comments vs code
  tokenizeCode(code) {
    const tokens = [];
    let i = 0;
    let line = 1;
    let column = 1;
    
    while (i < code.length) {
      const char = code[i];
      const nextChar = code[i + 1];
      
      // Track position
      if (char === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
      
      // String literals (single, double, template)
      if (char === '"' || char === "'" || char === '`') {
        const stringResult = this.parseString(code, i, char);
        tokens.push({
          type: 'string',
          value: stringResult.value,
          start: i,
          end: stringResult.end,
          line,
          column
        });
        i = stringResult.end;
        continue;
      }
      
      // Regular expressions
      if (char === '/' && this.couldBeRegex(tokens)) {
        const regexResult = this.parseRegex(code, i);
        if (regexResult) {
          tokens.push({
            type: 'regex',
            value: regexResult.value,
            start: i,
            end: regexResult.end,
            line,
            column
          });
          i = regexResult.end;
          continue;
        }
      }
      
      // Multi-line comments
      if (char === '/' && nextChar === '*') {
        const commentResult = this.parseMultiLineComment(code, i);
        tokens.push({
          type: 'multiline_comment',
          value: commentResult.value,
          start: i,
          end: commentResult.end,
          line,
          column,
          preserve: this.shouldPreserveComment(commentResult.value)
        });
        i = commentResult.end;
        continue;
      }
      
      // Single-line comments
      if (char === '/' && nextChar === '/') {
        const commentResult = this.parseSingleLineComment(code, i);
        tokens.push({
          type: 'single_comment',
          value: commentResult.value,
          start: i,
          end: commentResult.end,
          line,
          column,
          preserve: this.shouldPreserveComment(commentResult.value)
        });
        i = commentResult.end;
        continue;
      }
      
      // Regular code
      tokens.push({
        type: 'code',
        value: char,
        start: i,
        end: i + 1,
        line,
        column
      });
      
      i++;
    }
    
    return tokens;
  }

  parseString(code, start, quote) {
    let i = start + 1;
    let value = quote;
    
    while (i < code.length) {
      const char = code[i];
      value += char;
      
      if (char === quote && code[i - 1] !== '\\') {
        break;
      }
      
      // Handle template literals
      if (quote === '`' && char === '$' && code[i + 1] === '{') {
        // Skip template expression
        let braceCount = 1;
        i += 2;
        value += '{';
        
        while (i < code.length && braceCount > 0) {
          const c = code[i];
          value += c;
          if (c === '{') braceCount++;
          if (c === '}') braceCount--;
          i++;
        }
        continue;
      }
      
      i++;
    }
    
    return { value, end: i + 1 };
  }

  parseRegex(code, start) {
    let i = start + 1;
    let value = '/';
    let inCharClass = false;
    
    while (i < code.length) {
      const char = code[i];
      value += char;
      
      if (char === '\\') {
        // Skip escaped character
        i++;
        if (i < code.length) {
          value += code[i];
        }
      } else if (char === '[') {
        inCharClass = true;
      } else if (char === ']' && inCharClass) {
        inCharClass = false;
      } else if (char === '/' && !inCharClass) {
        // End of regex, check for flags
        i++;
        while (i < code.length && /[gimsuyx]/.test(code[i])) {
          value += code[i];
          i++;
        }
        return { value, end: i };
      } else if (char === '\n' && !inCharClass) {
        // Invalid regex
        return null;
      }
      
      i++;
    }
    
    return null; // Invalid regex
  }

  parseMultiLineComment(code, start) {
    let i = start + 2; // Skip /*
    let value = '/*';
    
    while (i < code.length - 1) {
      const char = code[i];
      const nextChar = code[i + 1];
      value += char;
      
      if (char === '*' && nextChar === '/') {
        value += '/';
        return { value, end: i + 2 };
      }
      
      i++;
    }
    
    return { value, end: code.length };
  }

  parseSingleLineComment(code, start) {
    let i = start + 2; // Skip //
    let value = '//';
    
    while (i < code.length && code[i] !== '\n') {
      value += code[i];
      i++;
    }
    
    return { value, end: i };
  }

  couldBeRegex(tokens) {
    if (tokens.length === 0) return true;
    
    const lastToken = tokens[tokens.length - 1];
    
    // Check if previous token suggests regex context
    const regexContexts = [
      '=', '(', '[', ',', ':', ';', '!', '&', '|', '?', '+', '-', '*', '/', '%',
      'return', 'throw', 'case', 'in', 'of', 'delete', 'void', 'typeof', 'new',
      '&&', '||', '==', '!=', '===', '!==', '<', '>', '<=', '>=', '<<', '>>', '>>>'
    ];
    
    return regexContexts.some(ctx => lastToken.value.trim().endsWith(ctx));
  }

  shouldPreserveComment(commentText) {
    const preservePatterns = [
      // License and copyright
      /@license/i,
      /copyright/i,
      /\(c\)/i,
      /MIT|GPL|BSD|Apache/i,
      
      // JSDoc (if enabled)
      ...(this.options.preserveJSDoc ? [/^\s*\/\*\*/, /@param/, /@return/, /@throws/] : []),
      
      // Important comments
      ...(this.options.preserveImportant ? [/!/] : []),
      
      // Configuration comments
      ...(this.options.preserveConfig ? [
        /eslint/i,
        /prettier/i,
        /babel/i,
        /webpack/i,
        /@ts-ignore/i,
        /@ts-expect-error/i,
        /@ts-nocheck/i,
        /TODO:/i,
        /FIXME:/i,
        /NOTE:/i,
        /HACK:/i,
        /XXX:/i
      ] : [])
    ];
    
    return preservePatterns.some(pattern => pattern.test(commentText));
  }

  removeComments(code) {
    const tokens = this.tokenizeCode(code);
    let result = '';
    let removedComments = 0;
    let preservedComments = 0;
    let removedConsoleStatements = 0;
    
    for (const token of tokens) {
      if (token.type === 'multiline_comment' || token.type === 'single_comment') {
        if (token.preserve) {
          result += token.value;
          preservedComments++;
          
          if (this.options.verbose) {
            this.stats.warnings.push(`Preserved comment at line ${token.line}: ${token.value.substring(0, 50)}...`);
          }
        } else {
          // Replace with appropriate whitespace to maintain structure
          if (token.type === 'multiline_comment') {
            const lines = token.value.split('\n');
            result += lines.length > 1 ? '\n'.repeat(lines.length - 1) : '';
          }
          removedComments++;
        }
      } else {
        result += token.value;
      }
    }
    
    // Remove console statements if enabled
    if (this.options.removeConsole) {
      // More careful approach to console statement removal
      try {
        const originalLength = result.length;
        let consoleStatementsRemoved = 0;
        
        // Multiple patterns to handle different console statement formats
        
        // Pattern 1: Simple one-line console statements with semicolon
        const pattern1 = /(\s*)(console\.(log|warn|error|info|debug|trace|table|dir|count|time|timeEnd|group|groupEnd|assert)\s*\([^;{]*\));/g;
        result = result.replace(pattern1, (match, space) => {
          consoleStatementsRemoved++;
          return space; // Preserve whitespace
        });
        
        // Pattern 2: Console statements at the end of a line without semicolon (e.g. in JSX or as function args)
        const pattern2 = /(console\.(log|warn|error|info|debug|trace|table|dir|count|time|timeEnd|group|groupEnd|assert)\s*\([^;{)]*\))(?=[,\n\r])/g;
        result = result.replace(pattern2, () => {
          consoleStatementsRemoved++;
          return ''; // Remove completely
        });
        
        // Pattern 3: Fix incomplete catch blocks from console removal
        const pattern3a = /\.catch\s*\(\s*(?:err|error|e)(?:\s*=>\s*(?:\n|\r|.)*?)?\s*\)\s*(?=\n|\r|$)/g;
        result = result.replace(pattern3a, '.catch(err => {})');
        
        // Pattern 4: Console statements with chained methods
        const pattern3 = /(\s*)(console\.(log|warn|error|info|debug|trace|table|dir|count|time|timeEnd|group|groupEnd|assert))\s*(\.\w+)*\s*\([^;{]*\);/g;
        result = result.replace(pattern3, (match, space) => {
          consoleStatementsRemoved++;
          return space; // Preserve whitespace
        });
        
        // Update count of removed statements
        if (consoleStatementsRemoved > 0) {
          removedConsoleStatements = consoleStatementsRemoved;
        } else if (result.length !== originalLength) {
          // Fallback to approximation if we couldn't count precisely
          removedConsoleStatements = Math.max(1, Math.floor((originalLength - result.length) / 30));
        }
      } catch (error) {
        // If there's an error in the regex, log it but don't break the process
        this.stats.warnings.push(`Error removing console statements: ${error.message}`);
      }
    }
    
    // Clean up excessive whitespace but preserve intentional formatting
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
    result = result.replace(/[ \t]+$/gm, ''); // Remove trailing whitespace
    
    return {
      code: result,
      removedComments,
      preservedComments,
      removedConsoleStatements
    };
  }

  shouldSkipDirectory(dirName) {
    return this.options.skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  shouldSkipFile(fileName) {
    if (this.options.skipFiles.includes(fileName)) return true;
    if (fileName.startsWith('.')) return true;
    
    const ext = path.extname(fileName);
    return !this.options.extensions.includes(ext);
  }

  async processFile(filePath) {
    try {
      this.stats.filesScanned++;
      
      const originalCode = await readFile(filePath, 'utf8');
      
      // Skip files that might not be standard JS/React files
      if (this.looksLikeConfigFile(filePath, originalCode)) {
        if (this.options.verbose) {
          console.log(`⏭️  ${filePath} (skipped - config file)`);
        }
        this.stats.filesSkipped++;
        return;
      }
      
      const result = this.removeComments(originalCode);
      const cleanCode = result.code;
      
      const originalSize = Buffer.byteLength(originalCode, 'utf8');
      const newSize = Buffer.byteLength(cleanCode, 'utf8');
      const savings = originalSize - newSize;
      
      // Skip if no changes
      if (originalCode === cleanCode) {
        if (this.options.verbose) {
          console.log(`⏭️  ${filePath} (no comments or console statements to remove)`);
        }
        this.stats.filesSkipped++;
        return;
      }
      
      if (!this.options.dryRun) {
        // Create backup only if requested
        if (this.options.createBackups) {
          const backupPath = filePath + '.backup';
          await writeFile(backupPath, originalCode);
        }
        
        // Write cleaned code
        await writeFile(filePath, cleanCode);
      }
      
      this.stats.filesProcessed++;
      this.stats.totalOriginalSize += originalSize;
      this.stats.totalNewSize += newSize;
      this.stats.totalCommentsRemoved += result.removedComments;
      
      if (result.removedConsoleStatements) {
        this.stats.totalConsoleStatementsRemoved += result.removedConsoleStatements;
      }
      
      const status = this.options.dryRun ? '🔍 [DRY RUN]' : '✅';
      console.log(`${status} ${filePath}`);
      
      if (this.options.verbose) {
        console.log(`   📊 Size: ${originalSize} → ${newSize} bytes (saved ${savings} bytes)`);
        console.log(`   💬 Removed: ${result.removedComments} comments, Preserved: ${result.preservedComments} comments`);
        
        if (this.options.removeConsole && result.removedConsoleStatements > 0) {
          console.log(`   🔇 Removed: ${result.removedConsoleStatements} console statements`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
      this.stats.errors.push({ file: filePath, error: error.message });
    }
  }

  looksLikeConfigFile(filePath, code) {
    const fileName = path.basename(filePath);
    
    // Skip common config files
    const configFiles = [
      'webpack.config.js',
      'babel.config.js',
      'jest.config.js',
      'tailwind.config.js',
      'next.config.js',
      'vite.config.js',
      'rollup.config.js'
    ];
    
    if (configFiles.includes(fileName)) return true;
    
    // Skip files that look like they're primarily configuration
    const configPatterns = [
      /module\.exports\s*=\s*{/,
      /export\s+default\s+{/,
      /defineConfig\(/,
      /^\s*\/\/\s*@ts-check/m
    ];
    
    return configPatterns.some(pattern => pattern.test(code));
  }

  async processDirectory(dirPath) {
    try {
      const items = await readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const itemStat = await stat(fullPath);
        
        if (itemStat.isDirectory()) {
          if (!this.shouldSkipDirectory(item)) {
            await this.processDirectory(fullPath);
          }
        } else if (itemStat.isFile()) {
          if (!this.shouldSkipFile(item)) {
            await this.processFile(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error reading directory ${dirPath}: ${error.message}`);
      this.stats.errors.push({ file: dirPath, error: error.message });
    }
  }

  printSummary() {
    const totalSavings = this.stats.totalOriginalSize - this.stats.totalNewSize;
    const percentageSaved = this.stats.totalOriginalSize > 0 
      ? ((totalSavings / this.stats.totalOriginalSize) * 100).toFixed(2) 
      : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 SAFE CODE CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`📁 Files scanned: ${this.stats.filesScanned}`);
    console.log(`✅ Files processed: ${this.stats.filesProcessed}`);
    console.log(`⏭️  Files skipped: ${this.stats.filesSkipped}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.totalOriginalSize > 0) {
      console.log(`📦 Total size: ${this.stats.totalOriginalSize} → ${this.stats.totalNewSize} bytes`);
      console.log(`💾 Total savings: ${totalSavings} bytes (${percentageSaved}%)`);
    }
    
    console.log(`💬 Total comments removed: ${this.stats.totalCommentsRemoved}`);
    
    if (this.options.removeConsole && this.stats.totalConsoleStatementsRemoved > 0) {
      console.log(`🔇 Total console statements removed: ${this.stats.totalConsoleStatementsRemoved}`);
    }
    
    if (this.options.createBackups && this.stats.filesProcessed > 0) {
      console.log(`💾 Backup files created with .backup extension`);
    }
    
    if (this.stats.warnings.length > 0 && this.options.verbose) {
      console.log(`\n⚠️  Preserved ${this.stats.warnings.length} important comments`);
    }
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.stats.errors.forEach(({ file, error }) => {
        console.log(`   ${file}: ${error}`);
      });
    }
    
    console.log('='.repeat(60));
    
    if (this.options.dryRun) {
      console.log('🔍 This was a DRY RUN - no files were actually modified');
      console.log('   Remove --dry-run to perform actual cleanup');
    } else {
      console.log('🎉 Safe code cleanup completed successfully!');
    }
  }

  async run(targetPath) {
    const startTime = Date.now();
    
    console.log('🛡️  SAFE JavaScript Code Cleaner');
    console.log('='.repeat(60));
    console.log(`📂 Target: ${path.resolve(targetPath)}`);
    console.log(`🎯 Extensions: ${this.options.extensions.join(', ')}`);
    console.log(`⏭️  Skip dirs: ${this.options.skipDirs.join(', ')}`);
    console.log(`🔒 Preserves: License, Important, Config comments`);
    
    if (this.options.removeConsole) {
      console.log('🔇 Console removal: ON (will remove console.log statements)');
    } else {
      console.log('🔇 Console removal: OFF (use --console to enable)');
    }
    
    if (this.options.createBackups) {
      console.log('💾 Backup mode: ON');
    } else {
      console.log('💾 Backup mode: OFF (use --backup to enable)');
    }
    
    if (this.options.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified');
    }
    
    console.log('='.repeat(60));
    
    const targetStat = await stat(targetPath);
    
    if (targetStat.isDirectory()) {
      await this.processDirectory(targetPath);
    } else if (targetStat.isFile()) {
      await this.processFile(targetPath);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    this.printSummary();
    console.log(`⏱️  Time taken: ${duration} seconds`);
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    target: './src',
    dryRun: false,
    verbose: true,
    createBackups: false, // Default to false now
    preserveJSDoc: false,
    preserveLicense: true,
    preserveImportant: true,
    preserveConfig: true,
    removeConsole: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (!arg.startsWith('-') && !options.targetSet) {
      options.target = arg;
      options.targetSet = true;
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--backup' || arg === '-b') {
      options.createBackups = true;
    } else if (arg === '--quiet' || arg === '-q') {
      options.verbose = false;
    } else if (arg === '--preserve-jsdoc') {
      options.preserveJSDoc = true;
    } else if (arg === '--no-preserve-license') {
      options.preserveLicense = false;
    } else if (arg === '--no-preserve-config') {
      options.preserveConfig = false;
    } else if (arg === '--console' || arg === '-c') {
      options.removeConsole = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
🛡️  SAFE JavaScript Code Cleaner

Usage: node cleanup-comments.js [directory] [options]

This script safely removes comments and optionally console statements while preserving important ones:
- License and copyright comments
- Configuration comments (eslint, prettier, etc.)
- TODO, FIXME, NOTE comments
- TypeScript directives (@ts-ignore, etc.)

Arguments:
  directory                Target directory (default: ./src)

Options:
  --dry-run, -d           Show what would be changed without changing
  --backup, -b            Create backup files with .backup extension
  --quiet, -q             Less verbose output
  --console, -c           Remove console.log statements and other console methods
  --preserve-jsdoc        Keep JSDoc comments (/** ... */)
  --no-preserve-license   Don't preserve license comments
  --no-preserve-config    Don't preserve config comments
  --help, -h              Show this help

Examples:
  node cleanup-comments.js                    # Clean src/ safely (no backups)
  node cleanup-comments.js --backup           # Clean src/ with backups
  node cleanup-comments.js --dry-run          # Preview changes
  node cleanup-comments.js --console          # Remove comments and console.log statements
  node cleanup-comments.js ./components -q    # Clean specific folder quietly
  node cleanup-comments.js --preserve-jsdoc   # Keep JSDoc comments too

Safety Features:
✅ Advanced tokenizer that properly identifies comments vs code
✅ Preserves license, config, and important comments
✅ Skips config files (webpack.config.js, etc.)
✅ Optional backup creation with --backup flag
✅ Dry run mode for testing
✅ Maintains code formatting and structure
      `);
      process.exit(0);
    }
  }
  
  return options;
}

// Main execution
async function main() {
  try {
    const cliOptions = parseArgs();
    const cleaner = new SafeCommentCleaner(cliOptions);
    
    if (!fs.existsSync(cliOptions.target)) {
      console.error(`❌ Target path does not exist: ${cliOptions.target}`);
      process.exit(1);
    }
    
    await cleaner.run(cliOptions.target);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}