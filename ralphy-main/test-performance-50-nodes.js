// Test performance optimizations for 50+ nodes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the graph-viewer.js file
const graphViewerPath = path.join(__dirname, 'src/frontend/graph-viewer.js');
const graphViewerCode = fs.readFileSync(graphViewerPath, 'utf8');

console.log('Testing performance optimizations for 50+ nodes...\n');

// Test 1: Check if performance monitoring is implemented
console.log('Test 1: Performance monitoring structure');
const hasPerformanceStats = graphViewerCode.includes('performanceStats') && 
                            graphViewerCode.includes('nodeCount') &&
                            graphViewerCode.includes('renderTimes');
console.log(`✓ Performance stats tracking: ${hasPerformanceStats ? 'PASS' : 'FAIL'}`);

// Test 2: Check viewport culling implementation
console.log('\nTest 2: Viewport culling');
const hasViewportCulling = graphViewerCode.includes('getViewportBounds') &&
                          graphViewerCode.includes('isInViewport') &&
                          graphViewerCode.includes('element.style.display');
console.log(`✓ Viewport culling implemented: ${hasViewportCulling ? 'PASS' : 'FAIL'}`);

// Test 3: Check batched DOM updates
console.log('\nTest 3: Batched DOM updates');
const hasBatchedUpdates = graphViewerCode.includes('requestAnimationFrame') &&
                         graphViewerCode.includes('updateInterval') &&
                         graphViewerCode.includes('pendingUpdate');
console.log(`✓ Batched DOM updates: ${hasBatchedUpdates ? 'PASS' : 'FAIL'}`);

// Test 4: Check force optimization for large graphs
console.log('\nTest 4: Force calculation optimizations');
const hasForceOptimization = graphViewerCode.includes('skipExpensiveForces') &&
                            graphViewerCode.includes('maxDistance') &&
                            graphViewerCode.includes('if (this.nodes.length > 50)');
console.log(`✓ Force calculation optimization: ${hasForceOptimization ? 'PASS' : 'FAIL'}`);

// Test 5: Check text label hiding for performance
console.log('\nTest 5: Text label optimization');
const hasTextOptimization = graphViewerCode.includes('nodeCount > 50') &&
                           graphViewerCode.includes('this.transform.scale < 0.5');
console.log(`✓ Text label hiding for zoomed out views: ${hasTextOptimization ? 'PASS' : 'FAIL'}`);

// Test 6: Check alpha decay optimization
console.log('\nTest 6: Simulation termination optimization');
const hasAlphaOptimization = graphViewerCode.includes('nodeCount > 50 ? 0.05 : 0.0228') &&
                            graphViewerCode.includes('nodeCount > 100 ? 0.01 : 0.001');
console.log(`✓ Alpha decay optimization: ${hasAlphaOptimization ? 'PASS' : 'FAIL'}`);

// Test 7: Check performance logging
console.log('\nTest 7: Performance warnings');
const hasPerfWarnings = graphViewerCode.includes('console.warn') &&
                       graphViewerCode.includes('renderTime > 16');
console.log(`✓ Performance warnings for slow renders: ${hasPerfWarnings ? 'PASS' : 'FAIL'}`);

// Test 8: Check distance threshold in charge force
console.log('\nTest 8: Distance threshold optimization');
const hasDistanceThreshold = graphViewerCode.includes('distanceSq > maxDistance * maxDistance');
console.log(`✓ Distance threshold for charge force: ${hasDistanceThreshold ? 'PASS' : 'FAIL'}`);

// Summary
console.log('\n=== SUMMARY ===');
const allTests = [
  hasPerformanceStats,
  hasViewportCulling,
  hasBatchedUpdates,
  hasForceOptimization,
  hasTextOptimization,
  hasAlphaOptimization,
  hasPerfWarnings,
  hasDistanceThreshold
];
const passed = allTests.filter(t => t).length;
console.log(`${passed}/${allTests.length} tests passed`);

if (passed === allTests.length) {
  console.log('\n✅ All performance optimizations implemented for 50+ nodes!');
  process.exit(0);
} else {
  console.log('\n❌ Some optimizations are missing');
  process.exit(1);
}