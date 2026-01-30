// Test suite for the "Test in terminal" button functionality
// This test file can be run directly with Node.js

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ Test failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Test passed: ${message}`);
};

// Mock the CommandViewer class methods
class CommandViewerTest {
  constructor() {
    this.clipboardText = null;
    this.buttonState = { text: '', style: {} };
  }

  escapeShellArg(arg) {
    if (!arg) return "''";
    if (/^[a-zA-Z0-9_\-./]+$/.test(arg)) {
      return arg;
    }
    return "'" + arg.replace(/'/g, "'\\''") + "'";
  }

  async copyToClipboard(text, buttonSelector, successMessage) {
    this.clipboardText = text;
    this.buttonState.text = successMessage;
    this.buttonState.style = { background: '#4caf50', color: 'white' };
  }

  testInTerminal(frontmatter) {
    if (!frontmatter.name) {
      console.error('No command name found');
      return;
    }

    let shellCommand = `looppool-cc ${this.escapeShellArg(frontmatter.name)}`;
    
    if (frontmatter['argument-hint']) {
      const hint = frontmatter['argument-hint']
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .replace(/^</, '')
        .replace(/>$/, '');
      
      const isOptional = frontmatter['argument-hint'].startsWith('[');
      
      if (!isOptional) {
        shellCommand += ` ${this.escapeShellArg(`<${hint}>`)}`;
      }
    }
    
    this.copyToClipboard(shellCommand, '.test-terminal', 'Test command copied!');
  }
}

// Run tests
console.log('Running tests for "Test in terminal" button functionality...\n');

// Test 1: Basic command with no arguments
const viewer1 = new CommandViewerTest();
const frontmatter1 = { name: 'lpl:init' };
viewer1.testInTerminal(frontmatter1);
assert(
  viewer1.clipboardText === "looppool-cc 'lpl:init'",
  'Basic command with no arguments'
);

// Test 2: Command with special characters in name
const viewer2 = new CommandViewerTest();
const frontmatter2 = { name: 'lpl:test-command' };
viewer2.testInTerminal(frontmatter2);
assert(
  viewer2.clipboardText === "looppool-cc 'lpl:test-command'",
  'Command with hyphen in name'
);

// Test 3: Command with required argument
const viewer3 = new CommandViewerTest();
const frontmatter3 = {
  name: 'lpl:create',
  'argument-hint': '<feature-name>'
};
viewer3.testInTerminal(frontmatter3);
assert(
  viewer3.clipboardText === "looppool-cc 'lpl:create' '<feature-name>'",
  'Command with required argument'
);

// Test 4: Command with optional argument
const viewer4 = new CommandViewerTest();
const frontmatter4 = {
  name: 'lpl:build',
  'argument-hint': '[target]'
};
viewer4.testInTerminal(frontmatter4);
assert(
  viewer4.clipboardText === "looppool-cc 'lpl:build'",
  'Command with optional argument (should not include placeholder)'
);

// Test 5: Shell escaping for command names with special characters
const viewer5 = new CommandViewerTest();
const frontmatter5 = { name: "lpl:test's" };
viewer5.testInTerminal(frontmatter5);
assert(
  viewer5.clipboardText === "looppool-cc 'lpl:test'\\''s'",
  'Shell escaping for single quotes'
);

// Test 6: Shell escaping method tests
const viewer6 = new CommandViewerTest();
assert(
  viewer6.escapeShellArg('simple-name') === 'simple-name',
  'No escaping for simple names'
);
assert(
  viewer6.escapeShellArg('name with spaces') === "'name with spaces'",
  'Escaping for spaces'
);
assert(
  viewer6.escapeShellArg("name's") === "'name'\\''s'",
  'Escaping for single quotes'
);
assert(
  viewer6.escapeShellArg('') === "''",
  'Empty string returns empty quotes'
);
assert(
  viewer6.escapeShellArg(null) === "''",
  'Null returns empty quotes'
);

// Test 7: Visual feedback
const viewer7 = new CommandViewerTest();
viewer7.testInTerminal({ name: 'lpl:test' });
assert(
  viewer7.clipboardText === "looppool-cc 'lpl:test'",
  'Command generated correctly'
);
assert(
  viewer7.buttonState.text === 'Test command copied!',
  'Success message displayed'
);
assert(
  viewer7.buttonState.style.background === '#4caf50',
  'Success background color'
);
assert(
  viewer7.buttonState.style.color === 'white',
  'Success text color'
);

// Test 8: No command name handling
const viewer8 = new CommandViewerTest();
const originalError = console.error;
let errorMessage = '';
console.error = (msg) => { errorMessage = msg; };
viewer8.testInTerminal({});
console.error = originalError;
assert(
  errorMessage === 'No command name found',
  'Error logged when no command name'
);
assert(
  viewer8.clipboardText === null,
  'No clipboard operation when no command name'
);

// Test 9: Complex argument hint parsing
const viewer9 = new CommandViewerTest();
const frontmatter9 = {
  name: 'lpl:deploy',
  'argument-hint': '<environment>'
};
viewer9.testInTerminal(frontmatter9);
assert(
  viewer9.clipboardText === "looppool-cc 'lpl:deploy' '<environment>'",
  'Argument hint with angle brackets'
);

// Test 10: Command with path-like characters
const viewer10 = new CommandViewerTest();
const frontmatter10 = { name: 'lpl:utils/helper' };
viewer10.testInTerminal(frontmatter10);
assert(
  viewer10.clipboardText === "looppool-cc 'lpl:utils/helper'",
  'Command with forward slash'
);

console.log('\n✅ All tests passed!');