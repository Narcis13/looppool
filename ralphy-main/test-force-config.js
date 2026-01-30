// Test for force simulation configuration
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing force simulation configuration...');

// Read the graph-viewer.js file
const graphViewerPath = path.join(__dirname, 'src/frontend/graph-viewer.js');
const graphViewerContent = fs.readFileSync(graphViewerPath, 'utf-8');

// Test 1: Check charge configuration
const chargeTest = graphViewerContent.includes('charge: -300');
console.log(`✓ Test 1 - Charge set to -300: ${chargeTest ? 'PASS' : 'FAIL'}`);

// Test 2: Check link distance function exists
const linkDistanceTest = graphViewerContent.includes('linkDistance: (edge) =>');
console.log(`✓ Test 2 - Link distance function exists: ${linkDistanceTest ? 'PASS' : 'FAIL'}`);

// Test 3: Check delegates-to distance
const delegatesDistanceTest = graphViewerContent.includes("edge.type === 'delegates-to') return 150");
console.log(`✓ Test 3 - Delegates-to distance is 150: ${delegatesDistanceTest ? 'PASS' : 'FAIL'}`);

// Test 4: Check spawns distance
const spawnsDistanceTest = graphViewerContent.includes("edge.type === 'spawns') return 120");
console.log(`✓ Test 4 - Spawns distance is 120: ${spawnsDistanceTest ? 'PASS' : 'FAIL'}`);

// Test 5: Check uses distance
const usesDistanceTest = graphViewerContent.includes("edge.type === 'uses') return 100");
console.log(`✓ Test 5 - Uses distance is 100: ${usesDistanceTest ? 'PASS' : 'FAIL'}`);

// Test 6: Check ForceSimulation accepts charge option
const chargeOptionTest = graphViewerContent.includes('charge: options.charge || -300');
console.log(`✓ Test 6 - ForceSimulation accepts charge option: ${chargeOptionTest ? 'PASS' : 'FAIL'}`);

// Test 7: Check applyForceCharge uses configured charge
const applyChargeTest = graphViewerContent.includes('const charge = this.options.charge;');
console.log(`✓ Test 7 - applyForceCharge uses configured charge: ${applyChargeTest ? 'PASS' : 'FAIL'}`);

// Test 8: Check force calculation with charge
const forceCalculationTest = graphViewerContent.includes('const force = charge * this.options.alpha / (distance * distance)');
console.log(`✓ Test 8 - Force calculation uses charge value: ${forceCalculationTest ? 'PASS' : 'FAIL'}`);

// Summary
const allTestsPassed = chargeTest && linkDistanceTest && delegatesDistanceTest && 
                      spawnsDistanceTest && usesDistanceTest && chargeOptionTest &&
                      applyChargeTest && forceCalculationTest;

console.log(`\n${allTestsPassed ? 'All tests passed!' : 'Some tests failed!'}`);
process.exit(allTestsPassed ? 0 : 1);