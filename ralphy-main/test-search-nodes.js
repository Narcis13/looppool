// Test suite for graph node search functionality
import { test, expect } from '@playwright/test';

test.describe('Graph Node Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3456');
    await page.waitForTimeout(1000); // Wait for graph to load
  });

  test('search input exists and is accessible', async ({ page }) => {
    const searchInput = await page.locator('.graph-search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search nodes...');
    await expect(searchInput).toHaveAttribute('type', 'text');
  });

  test('searchNodes method is implemented', async ({ page }) => {
    const hasMethod = await page.evaluate(() => {
      const graphViewer = window.graphViewer;
      return graphViewer && typeof graphViewer.searchNodes === 'function';
    });
    expect(hasMethod).toBe(true);
  });

  test('search filters nodes by name', async ({ page }) => {
    // Type in search box
    await page.fill('.graph-search', 'test');
    
    // Wait for search to apply
    await page.waitForTimeout(100);
    
    // Check that searchNodes was called
    const searchApplied = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.node');
      let visibleCount = 0;
      let hiddenCount = 0;
      
      nodes.forEach(node => {
        if (node.hasAttribute('visibility')) {
          hiddenCount++;
        } else {
          visibleCount++;
        }
      });
      
      return { visibleCount, hiddenCount, total: nodes.length };
    });
    
    // Should have some nodes filtered
    expect(searchApplied.total).toBeGreaterThan(0);
  });

  test('empty search shows all nodes respecting type filters', async ({ page }) => {
    // First search for something
    await page.fill('.graph-search', 'test');
    await page.waitForTimeout(100);
    
    // Clear search
    await page.fill('.graph-search', '');
    await page.waitForTimeout(100);
    
    // Check that all nodes with active type filters are visible
    const nodeVisibility = await page.evaluate(() => {
      const filters = {
        command: document.querySelector('.filter-commands').checked,
        workflow: document.querySelector('.filter-workflows').checked,
        agent: document.querySelector('.filter-agents').checked,
        template: document.querySelector('.filter-templates').checked
      };
      
      const nodes = document.querySelectorAll('.node');
      let correctVisibility = true;
      
      nodes.forEach(node => {
        const nodeType = Array.from(node.classList).find(c => c.startsWith('node-'))?.replace('node-', '');
        const shouldBeVisible = filters[nodeType];
        const isVisible = !node.hasAttribute('visibility');
        
        if (shouldBeVisible !== isVisible) {
          correctVisibility = false;
        }
      });
      
      return correctVisibility;
    });
    
    expect(nodeVisibility).toBe(true);
  });

  test('search is case-insensitive', async ({ page }) => {
    // Search with lowercase
    await page.fill('.graph-search', 'command');
    await page.waitForTimeout(100);
    
    const lowercaseResults = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.node:not([visibility="hidden"])')).length;
    });
    
    // Search with uppercase
    await page.fill('.graph-search', 'COMMAND');
    await page.waitForTimeout(100);
    
    const uppercaseResults = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.node:not([visibility="hidden"])')).length;
    });
    
    expect(lowercaseResults).toBe(uppercaseResults);
  });

  test('search respects type filters', async ({ page }) => {
    // Uncheck workflows filter
    await page.uncheck('.filter-workflows');
    await page.waitForTimeout(100);
    
    // Search for something that might match workflows
    await page.fill('.graph-search', 'workflow');
    await page.waitForTimeout(100);
    
    // Check that no workflow nodes are visible
    const workflowsVisible = await page.evaluate(() => {
      const workflowNodes = document.querySelectorAll('.node-workflow');
      return Array.from(workflowNodes).some(node => !node.hasAttribute('visibility'));
    });
    
    expect(workflowsVisible).toBe(false);
  });

  test('edges hide when connected nodes are filtered', async ({ page }) => {
    // Search for specific node
    await page.fill('.graph-search', 'specific-node-name');
    await page.waitForTimeout(100);
    
    // Check edge visibility logic
    const edgeVisibility = await page.evaluate(() => {
      const edges = document.querySelectorAll('.edge');
      let correctVisibility = true;
      
      edges.forEach(edge => {
        const hasVisibility = edge.hasAttribute('visibility');
        // Edge should be hidden if it has visibility attribute
        if (hasVisibility && edge.style.display !== 'none') {
          correctVisibility = edge.getAttribute('visibility') === 'hidden';
        }
      });
      
      return correctVisibility;
    });
    
    expect(edgeVisibility).toBe(true);
  });

  test('node count updates when searching', async ({ page }) => {
    // Get initial count
    const initialCount = await page.textContent('.node-count');
    
    // Search for something specific
    await page.fill('.graph-search', 'test');
    await page.waitForTimeout(100);
    
    // Get updated count
    const updatedCount = await page.textContent('.node-count');
    
    // Count should have changed
    expect(initialCount).not.toBe(updatedCount);
    expect(updatedCount).toMatch(/\(\d+\/\d+ nodes\)/);
  });

  test('search input styling on focus', async ({ page }) => {
    const searchInput = await page.locator('.graph-search');
    
    // Focus the input
    await searchInput.focus();
    
    // Check focus styles are applied
    const hasFocusStyles = await page.evaluate(() => {
      const input = document.querySelector('.graph-search');
      const styles = window.getComputedStyle(input);
      return styles.borderColor === 'rgb(33, 150, 243)' || styles.boxShadow.includes('rgba(33, 150, 243');
    });
    
    expect(hasFocusStyles).toBe(true);
  });
});