#!/usr/bin/env node

/**
 * Test for verifying template nodes are styled as gray in graph visualization
 */

const fs = require('fs').promises;
const path = require('path');

async function runTests() {
  const results = [];
  
  // Test 1: Verify graph-viewer.js file exists
  try {
    await fs.access(path.join(__dirname, 'src/frontend/graph-viewer.js'));
    results.push({ test: 'Graph viewer file exists', passed: true });
  } catch (error) {
    results.push({ test: 'Graph viewer file exists', passed: false, error: error.message });
  }

  // Test 2: Check getNodeColor method exists
  try {
    const content = await fs.readFile(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
    const hasMethod = content.includes('getNodeColor(type)');
    results.push({ 
      test: 'getNodeColor method exists', 
      passed: hasMethod,
      error: hasMethod ? null : 'getNodeColor method not found'
    });
  } catch (error) {
    results.push({ test: 'getNodeColor method exists', passed: false, error: error.message });
  }

  // Test 3: Verify template nodes return gray color
  try {
    const content = await fs.readFile(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
    const templateColorMatch = content.match(/case\s+'template':\s*return\s*'#9e9e9e'/);
    results.push({ 
      test: 'Template nodes return gray color (#9e9e9e)', 
      passed: !!templateColorMatch,
      error: templateColorMatch ? null : 'Template color not set to gray'
    });
  } catch (error) {
    results.push({ test: 'Template nodes return gray color', passed: false, error: error.message });
  }

  // Test 4: Verify gray color comment
  try {
    const content = await fs.readFile(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
    const hasComment = content.includes("case 'template': return '#9e9e9e'; // gray");
    results.push({ 
      test: 'Template color has gray comment', 
      passed: hasComment,
      error: hasComment ? null : 'Gray comment not found for template color'
    });
  } catch (error) {
    results.push({ test: 'Template color has gray comment', passed: false, error: error.message });
  }

  // Test 5: Verify getNodeColor is used in renderGraph
  try {
    const content = await fs.readFile(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
    const usesGetNodeColor = content.includes('this.getNodeColor(node.type)');
    results.push({ 
      test: 'renderGraph uses getNodeColor for node styling', 
      passed: usesGetNodeColor,
      error: usesGetNodeColor ? null : 'getNodeColor not used in renderGraph'
    });
  } catch (error) {
    results.push({ test: 'renderGraph uses getNodeColor', passed: false, error: error.message });
  }

  // Test 6: Verify all node types have distinct colors
  try {
    const content = await fs.readFile(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
    const hasCommand = content.includes("case 'command': return '#2196f3'");
    const hasWorkflow = content.includes("case 'workflow': return '#4caf50'");
    const hasAgent = content.includes("case 'agent': return '#ff9800'");
    const hasTemplate = content.includes("case 'template': return '#9e9e9e'");
    
    const allDistinct = hasCommand && hasWorkflow && hasAgent && hasTemplate;
    results.push({ 
      test: 'All node types have distinct colors', 
      passed: allDistinct,
      error: allDistinct ? null : 'Not all node types have distinct colors'
    });
  } catch (error) {
    results.push({ test: 'All node types have distinct colors', passed: false, error: error.message });
  }

  // Display results
  console.log('Template Node Gray Styling Test Results:');
  console.log('=====================================');
  
  let passedCount = 0;
  results.forEach(result => {
    if (result.passed) {
      console.log(`✓ ${result.test}`);
      passedCount++;
    } else {
      console.log(`✗ ${result.test}`);
      if (result.error) console.log(`  Error: ${result.error}`);
    }
  });
  
  console.log(`\nTotal: ${passedCount}/${results.length} tests passed`);
  
  // Return exit code
  return passedCount === results.length ? 0 : 1;
}

// Run tests
runTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});