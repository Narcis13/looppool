// Simple Quadtree implementation for spatial indexing
class Quadtree {
  constructor(x, y, width, height, maxDepth = 5, maxObjects = 10) {
    this.bounds = { x, y, width, height };
    this.maxDepth = maxDepth;
    this.maxObjects = maxObjects;
    this.objects = [];
    this.nodes = null;
    this.depth = 0;
  }
  
  clear() {
    this.objects = [];
    if (this.nodes) {
      for (let i = 0; i < 4; i++) {
        this.nodes[i].clear();
      }
      this.nodes = null;
    }
  }
  
  split() {
    const { x, y, width, height } = this.bounds;
    const subWidth = width / 2;
    const subHeight = height / 2;
    
    this.nodes = [
      new Quadtree(x, y, subWidth, subHeight, this.maxDepth, this.maxObjects),
      new Quadtree(x + subWidth, y, subWidth, subHeight, this.maxDepth, this.maxObjects),
      new Quadtree(x, y + subHeight, subWidth, subHeight, this.maxDepth, this.maxObjects),
      new Quadtree(x + subWidth, y + subHeight, subWidth, subHeight, this.maxDepth, this.maxObjects)
    ];
    
    for (let i = 0; i < 4; i++) {
      this.nodes[i].depth = this.depth + 1;
    }
  }
  
  getQuadrant(obj) {
    const { x, y, width, height } = this.bounds;
    const midX = x + width / 2;
    const midY = y + height / 2;
    
    const inTop = obj.y < midY;
    const inLeft = obj.x < midX;
    
    if (inTop) {
      return inLeft ? 0 : 1;
    } else {
      return inLeft ? 2 : 3;
    }
  }
  
  insert(obj) {
    if (this.nodes) {
      const quadrant = this.getQuadrant(obj);
      this.nodes[quadrant].insert(obj);
      return;
    }
    
    this.objects.push(obj);
    
    if (this.objects.length > this.maxObjects && this.depth < this.maxDepth) {
      if (!this.nodes) {
        this.split();
      }
      
      const remainingObjects = [];
      for (const o of this.objects) {
        const quadrant = this.getQuadrant(o);
        this.nodes[quadrant].insert(o);
      }
      this.objects = remainingObjects;
    }
  }
  
  retrieve(obj, found = []) {
    if (!this.nodes) {
      return [...found, ...this.objects];
    }
    
    const quadrant = this.getQuadrant(obj);
    found = this.nodes[quadrant].retrieve(obj, found);
    
    return found;
  }
  
  // Get all objects within a radius of a point
  queryRadius(x, y, radius, found = []) {
    const { x: bx, y: by, width: bw, height: bh } = this.bounds;
    
    // Check if circle intersects with quadrant bounds
    const closestX = Math.max(bx, Math.min(x, bx + bw));
    const closestY = Math.max(by, Math.min(y, by + bh));
    const distanceSquared = (x - closestX) ** 2 + (y - closestY) ** 2;
    
    if (distanceSquared > radius ** 2) {
      return found; // Circle doesn't intersect quadrant
    }
    
    // Check objects in this quadrant
    for (const obj of this.objects) {
      const dx = obj.x - x;
      const dy = obj.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        found.push(obj);
      }
    }
    
    // Check child quadrants
    if (this.nodes) {
      for (let i = 0; i < 4; i++) {
        this.nodes[i].queryRadius(x, y, radius, found);
      }
    }
    
    return found;
  }
}

// Force simulation implementation (zero-dependency)
class ForceSimulation {
  constructor(nodes, edges, options) {
    this.nodes = nodes.map(node => ({
      ...node,
      x: options.width * Math.random(),
      y: options.height * Math.random(),
      vx: 0,
      vy: 0,
      fx: null, // fixed x position (for dragging)
      fy: null  // fixed y position (for dragging)
    }));
    
    this.edges = edges.map(edge => ({
      ...edge,
      source: edge.source,
      target: edge.target
    }));
    
    this.options = {
      width: options.width || 800,
      height: options.height || 600,
      charge: options.charge || -300,
      linkDistance: options.linkDistance || 100,
      alpha: 1,
      alphaDecay: 0.0228,
      alphaMin: 0.001,
      velocityDecay: 0.4
    };
    
    this.listeners = {};
    this.running = false;
    
    // Create node lookup map
    this.nodeMap = new Map();
    this.nodes.forEach(node => {
      this.nodeMap.set(node.id, node);
    });
    
    // Initialize quadtree for 100+ nodes
    this.useQuadtree = nodes.length > 100;
    this.quadtree = null;
  }
  
  on(event, listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }
  
  emit(event) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener());
    }
  }
  
  getNodeById(id) {
    return this.nodeMap.get(id);
  }
  
  start() {
    this.running = true;
    this.tick();
    return this;
  }
  
  stop() {
    this.running = false;
    return this;
  }
  
  tick() {
    if (this.options.alpha < this.options.alphaMin) {
      this.running = false;
      return;
    }
    
    // Performance optimization: skip force calculations for large graphs at low alpha
    const nodeCount = this.nodes.length;
    const skipExpensiveForces = nodeCount > 100 && this.options.alpha < 0.3;
    
    // Apply forces
    if (!skipExpensiveForces) {
      this.applyForceCharge();
    }
    this.applyForceLink();
    this.applyForceCenter();
    
    // Update positions
    this.nodes.forEach(node => {
      if (node.fx !== null) node.x = node.fx;
      if (node.fy !== null) node.y = node.fy;
      
      if (node.fx === null) {
        node.vx *= this.options.velocityDecay;
        node.x += node.vx;
      }
      
      if (node.fy === null) {
        node.vy *= this.options.velocityDecay;
        node.y += node.vy;
      }
      
      // Keep nodes within bounds
      node.x = Math.max(20, Math.min(this.options.width - 20, node.x));
      node.y = Math.max(20, Math.min(this.options.height - 20, node.y));
    });
    
    // Decay alpha
    this.options.alpha *= (1 - this.options.alphaDecay);
    
    // Emit tick event
    this.emit('tick');
    
    // Continue simulation
    if (this.running) {
      requestAnimationFrame(() => this.tick());
    }
  }
  
  applyForceCharge() {
    const charge = this.options.charge;
    const theta = 0.9; // Barnes-Hut approximation parameter
    const maxDistance = 300; // Ignore nodes beyond this distance for performance
    
    // Build quadtree for 100+ nodes
    if (this.useQuadtree) {
      // Build quadtree from current node positions
      this.quadtree = new Quadtree(0, 0, this.options.width, this.options.height);
      this.nodes.forEach(node => {
        this.quadtree.insert(node);
      });
    }
    
    // Use spatial optimization for large graphs
    if (this.nodes.length > 50) {
      // Apply Barnes-Hut-like optimization with quadtree for 100+ nodes
      for (let i = 0; i < this.nodes.length; i++) {
        const nodeA = this.nodes[i];
        
        if (this.useQuadtree) {
          // Use quadtree to find nearby nodes efficiently
          const nearbyNodes = this.quadtree.queryRadius(nodeA.x, nodeA.y, maxDistance);
          
          for (const nodeB of nearbyNodes) {
            if (nodeA === nodeB) continue;
            
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distanceSq = dx * dx + dy * dy;
            const distance = Math.sqrt(distanceSq);
            
            if (distance > 0 && distance < maxDistance) {
              const force = charge * this.options.alpha / distanceSq;
              const fx = force * dx / distance;
              const fy = force * dy / distance;
              
              if (nodeA.fx === null) {
                nodeA.vx -= fx;
              }
              if (nodeA.fy === null) {
                nodeA.vy -= fy;
              }
            }
          }
        } else {
          // Standard optimization for 50-100 nodes
          for (let j = i + 1; j < this.nodes.length; j++) {
            const nodeB = this.nodes[j];
            
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distanceSq = dx * dx + dy * dy;
            
            // Skip if nodes are too far apart (performance optimization)
            if (distanceSq > maxDistance * maxDistance) continue;
            
            const distance = Math.sqrt(distanceSq);
            
            if (distance > 0) {
              const force = charge * this.options.alpha / distanceSq;
              const fx = force * dx / distance;
              const fy = force * dy / distance;
              
              if (nodeA.fx === null) {
                nodeA.vx -= fx;
              }
              if (nodeA.fy === null) {
                nodeA.vy -= fy;
              }
              if (nodeB.fx === null) {
                nodeB.vx += fx;
              }
              if (nodeB.fy === null) {
                nodeB.vy += fy;
              }
            }
          }
        }
      }
    } else {
      // Use original implementation for smaller graphs
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const nodeA = this.nodes[i];
          const nodeB = this.nodes[j];
          
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const force = charge * this.options.alpha / (distance * distance);
            const fx = force * dx / distance;
            const fy = force * dy / distance;
            
            if (nodeA.fx === null) {
              nodeA.vx -= fx;
            }
            if (nodeA.fy === null) {
              nodeA.vy -= fy;
            }
            if (nodeB.fx === null) {
              nodeB.vx += fx;
            }
            if (nodeB.fy === null) {
              nodeB.vy += fy;
            }
          }
        }
      }
    }
  }
  
  applyForceLink() {
    this.edges.forEach(edge => {
      const source = this.nodeMap.get(edge.source);
      const target = this.nodeMap.get(edge.target);
      
      if (!source || !target) return;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const linkDistance = typeof this.options.linkDistance === 'function' 
          ? this.options.linkDistance(edge) 
          : this.options.linkDistance;
          
        const force = (distance - linkDistance) * 0.3 * this.options.alpha;
        const fx = force * dx / distance;
        const fy = force * dy / distance;
        
        if (source.fx === null) {
          source.vx += fx;
        }
        if (source.fy === null) {
          source.vy += fy;
        }
        if (target.fx === null) {
          target.vx -= fx;
        }
        if (target.fy === null) {
          target.vy -= fy;
        }
      }
    });
  }
  
  applyForceCenter() {
    const centerX = this.options.width / 2;
    const centerY = this.options.height / 2;
    const strength = 0.1;
    
    let sx = 0;
    let sy = 0;
    let count = 0;
    
    this.nodes.forEach(node => {
      if (node.fx === null && node.fy === null) {
        sx += node.x;
        sy += node.y;
        count++;
      }
    });
    
    if (count > 0) {
      sx = sx / count - centerX;
      sy = sy / count - centerY;
      
      this.nodes.forEach(node => {
        if (node.fx === null) {
          node.x -= sx * strength;
        }
        if (node.fy === null) {
          node.y -= sy * strength;
        }
      });
    }
  }
}

class GraphViewer {
  constructor(container) {
    this.container = container;
    this.nodes = [];
    this.edges = [];
    this.nodeMap = new Map();
    
    // Performance monitoring
    this.performanceStats = {
      nodeCount: 0,
      edgeCount: 0,
      lastRenderTime: 0,
      avgRenderTime: 0,
      renderTimes: []
    };
    
    // Performance optimizations for large graphs
    this.useQuadtree = false; // Enable for 100+ nodes
    this.quadtree = null;
    this.levelOfDetail = {
      enabled: false,
      minZoomForLabels: 0.5,
      minZoomForEdges: 0.3,
      simplifyEdges: false
    };
    
    // Canvas rendering for 200+ nodes
    this.useCanvas = false;
    this.canvas = null;
    this.ctx = null;
    this.canvasNodeRadius = 6;
    this.canvasHighlightedNodes = new Set();
    this.canvasHighlightedEdges = new Set();
    this.canvasHoveredNode = null;
    
    // Layout persistence
    this.layoutStorageKey = 'lpl-graph-layout';
    this.savedLayout = null;
    
    this.setupHTML();
  }

  setupHTML() {
    this.container.innerHTML = `
      <div class="graph-viewer">
        <div class="graph-header">
          <h2>System Graph <span class="node-count"></span></h2>
          <div class="graph-filters">
            <label><input type="checkbox" class="filter-commands" checked> Commands</label>
            <label><input type="checkbox" class="filter-workflows" checked> Workflows</label>
            <label><input type="checkbox" class="filter-agents" checked> Agents</label>
            <label><input type="checkbox" class="filter-templates" checked> Templates</label>
          </div>
          <input type="text" class="graph-search" placeholder="Search nodes...">
          <div class="graph-layout-controls">
            <button class="btn-save-layout" title="Save current layout">Save Layout</button>
            <button class="btn-reset-layout" title="Reset to default layout">Reset Layout</button>
          </div>
        </div>
        <div class="graph-canvas"></div>
      </div>
    `;

    this.canvas = this.container.querySelector('.graph-canvas');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Filter checkboxes
    const filterCheckboxes = this.container.querySelectorAll('[type="checkbox"]');
    filterCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateFilters());
    });

    // Search input
    const searchInput = this.container.querySelector('.graph-search');
    searchInput.addEventListener('input', (e) => this.searchNodes(e.target.value));
    
    // Layout control buttons
    const saveBtn = this.container.querySelector('.btn-save-layout');
    const resetBtn = this.container.querySelector('.btn-reset-layout');
    
    saveBtn?.addEventListener('click', () => {
      if (this.saveLayout()) {
        // Provide visual feedback
        saveBtn.textContent = 'Saved!';
        saveBtn.style.background = '#4caf50';
        setTimeout(() => {
          saveBtn.textContent = 'Save Layout';
          saveBtn.style.background = '';
        }, 2000);
      }
    });
    
    resetBtn?.addEventListener('click', () => {
      if (confirm('Reset to default layout? This will clear your saved positions.')) {
        this.clearLayout();
        // Reload the graph to apply default layout
        this.loadGraph();
      }
    });
  }

  // Parse graph data from file relationships
  async parseGraphData() {
    this.nodes = [];
    this.edges = [];
    this.nodeMap.clear();

    try {
      // Fetch file tree
      const response = await fetch('/api/tree');
      const tree = await response.json();
      
      // Extract command, workflow, agent, and template files
      const files = this.extractFiles(tree);
      
      // Parse relationships from each file
      for (const file of files) {
        await this.parseFileRelationships(file);
      }
      
      return { nodes: this.nodes, edges: this.edges };
    } catch (error) {
      console.error('Error parsing graph data:', error);
      return { nodes: [], edges: [] };
    }
  }

  extractFiles(node, path = '', files = []) {
    if (node.type === 'file') {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      
      // Check if it's a relevant file type
      if (fullPath.startsWith('commands/') && fullPath.endsWith('.md')) {
        files.push({ path: fullPath, type: 'command' });
      } else if (fullPath.startsWith('looppool/workflows/') && fullPath.endsWith('.md')) {
        files.push({ path: fullPath, type: 'workflow' });
      } else if (fullPath.startsWith('agents/') && fullPath.endsWith('.md')) {
        files.push({ path: fullPath, type: 'agent' });
      } else if (fullPath.startsWith('looppool/templates/') && fullPath.endsWith('.md')) {
        files.push({ path: fullPath, type: 'template' });
      }
    } else if (node.children) {
      const currentPath = path ? `${path}/${node.name}` : node.name;
      for (const child of node.children) {
        this.extractFiles(child, currentPath, files);
      }
    }
    
    return files;
  }

  async parseFileRelationships(file) {
    try {
      // Fetch file content
      const response = await fetch(`/api/file?path=${encodeURIComponent(file.path)}`);
      const content = await response.text();
      
      // Add node for this file
      const nodeId = file.path;
      const nodeName = file.path.split('/').pop().replace('.md', '');
      
      if (!this.nodeMap.has(nodeId)) {
        const node = {
          id: nodeId,
          name: nodeName,
          type: file.type,
          path: file.path
        };
        this.nodes.push(node);
        this.nodeMap.set(nodeId, node);
      }
      
      // Parse relationships based on file type
      if (file.type === 'command') {
        this.parseCommandRelationships(nodeId, content);
      } else if (file.type === 'workflow') {
        this.parseWorkflowRelationships(nodeId, content);
      } else if (file.type === 'agent') {
        this.parseAgentRelationships(nodeId, content);
      }
      
    } catch (error) {
      console.error(`Error parsing file ${file.path}:`, error);
    }
  }

  parseCommandRelationships(commandId, content) {
    // Extract workflow references from command files
    // Pattern: references to workflows/*.md files
    const workflowPattern = /looppool\/workflows\/[\w-]+\.md/g;
    const matches = content.match(workflowPattern) || [];
    
    for (const match of matches) {
      // Filter out matches that appear in code blocks
      const beforeMatch = content.substring(0, content.indexOf(match));
      const codeBlockCount = (beforeMatch.match(/```/g) || []).length;
      if (codeBlockCount % 2 === 0) { // Not in a code block
        this.addRelationship(commandId, match, 'delegates-to');
      }
    }
  }

  parseWorkflowRelationships(workflowId, content) {
    // Extract agent references from workflow files
    const agentPattern = /agents\/[\w-]+\.md/g;
    const matches = content.match(agentPattern) || [];
    
    for (const match of matches) {
      // Filter out matches that appear in code blocks
      const beforeMatch = content.substring(0, content.indexOf(match));
      const codeBlockCount = (beforeMatch.match(/```/g) || []).length;
      if (codeBlockCount % 2 === 0) { // Not in a code block
        this.addRelationship(workflowId, match, 'spawns');
      }
    }
  }

  parseAgentRelationships(agentId, content) {
    // Extract template references from agent files
    const templatePattern = /looppool\/templates\/[\w-]+\.md/g;
    const matches = content.match(templatePattern) || [];
    
    for (const match of matches) {
      // Filter out matches that appear in code blocks
      const beforeMatch = content.substring(0, content.indexOf(match));
      const codeBlockCount = (beforeMatch.match(/```/g) || []).length;
      if (codeBlockCount % 2 === 0) { // Not in a code block
        this.addRelationship(agentId, match, 'uses');
      }
    }
  }

  addRelationship(sourceId, targetPath, relationshipType) {
    // Ensure target node exists
    if (!this.nodeMap.has(targetPath)) {
      // Determine type from path
      let type = 'unknown';
      if (targetPath.startsWith('looppool/workflows/')) type = 'workflow';
      else if (targetPath.startsWith('agents/')) type = 'agent';
      else if (targetPath.startsWith('looppool/templates/')) type = 'template';
      
      const nodeName = targetPath.split('/').pop().replace('.md', '');
      const node = {
        id: targetPath,
        name: nodeName,
        type: type,
        path: targetPath
      };
      this.nodes.push(node);
      this.nodeMap.set(targetPath, node);
    }
    
    // Add edge
    this.edges.push({
      source: sourceId,
      target: targetPath,
      type: relationshipType
    });
  }

  updateFilters() {
    // Get filter states
    const filters = {
      command: this.container.querySelector('.filter-commands').checked,
      workflow: this.container.querySelector('.filter-workflows').checked,
      agent: this.container.querySelector('.filter-agents').checked,
      template: this.container.querySelector('.filter-templates').checked
    };

    // Store filter state
    this.activeFilters = filters;
    
    // Get current search query
    const searchInput = this.container.querySelector('.graph-search');
    const searchQuery = searchInput?.value?.toLowerCase().trim() || '';

    // Apply filters to nodes
    this.nodeElements?.forEach(({ element, data }) => {
      const typeFilterActive = filters[data.type];
      const nameMatches = !searchQuery || data.name.toLowerCase().includes(searchQuery);
      const isVisible = typeFilterActive && nameMatches;
      
      // Use SVG visibility attribute instead of display style
      if (isVisible) {
        element.removeAttribute('visibility');
        element.classList.remove('filtered-out');
      } else {
        element.setAttribute('visibility', 'hidden');
        element.classList.add('filtered-out');
      }
      
      // Update simulation node to stop physics on hidden nodes
      const simNode = this.simulation?.getNodeById(data.id);
      if (simNode) {
        if (!isVisible) {
          // Fix position when hiding
          simNode.fx = simNode.x;
          simNode.fy = simNode.y;
        } else {
          // Unfix position when showing (unless being dragged)
          if (!simNode._isDragging) {
            simNode.fx = null;
            simNode.fy = null;
          }
        }
      }
    });

    // Apply filters to edges (hide edges where source or target is hidden)
    this.edgeElements?.forEach(({ element, data }) => {
      const sourceNode = this.nodeMap.get(data.source);
      const targetNode = this.nodeMap.get(data.target);
      const isVisible = filters[sourceNode?.type] && filters[targetNode?.type];
      
      // Use SVG visibility attribute
      if (isVisible) {
        element.removeAttribute('visibility');
        element.classList.remove('filtered-out');
      } else {
        element.setAttribute('visibility', 'hidden');
        element.classList.add('filtered-out');
      }
    });

    // Update visible node count display
    const visibleNodes = this.nodeElements?.filter(({ data }) => filters[data.type]).length || 0;
    const totalNodes = this.nodeElements?.length || 0;
    this.updateNodeCountDisplay(visibleNodes, totalNodes);

    // Restart simulation with lower alpha for smooth repositioning
    if (this.simulation && visibleNodes > 0) {
      this.simulation.options.alpha = 0.3;
      this.simulation.start();
    }
  }

  updateNodeCountDisplay(visible, total) {
    const countElement = this.container.querySelector('.node-count');
    if (countElement) {
      countElement.textContent = `(${visible}/${total} nodes)`;
      countElement.style.fontSize = '14px';
      countElement.style.color = '#666';
      countElement.style.fontWeight = 'normal';
    }
  }

  searchNodes(query) {
    // Normalize query for case-insensitive search
    const searchQuery = query.toLowerCase().trim();
    
    // If query is empty, show all nodes (respecting filters)
    if (!searchQuery) {
      this.updateFilters();
      return;
    }
    
    // Apply search filter to nodes
    this.nodeElements?.forEach(({ element, data }) => {
      // Check if node type is filtered out
      const typeFilterActive = this.activeFilters && this.activeFilters[data.type];
      
      // Check if node name matches search query
      const nameMatches = data.name.toLowerCase().includes(searchQuery);
      
      // Node is visible if it matches search AND type filter is active
      const isVisible = nameMatches && typeFilterActive;
      
      // Apply visibility
      if (isVisible) {
        element.removeAttribute('visibility');
        element.classList.remove('filtered-out');
        element.classList.remove('search-filtered');
      } else {
        element.setAttribute('visibility', 'hidden');
        element.classList.add('filtered-out');
        if (!nameMatches) {
          element.classList.add('search-filtered');
        }
      }
      
      // Update simulation node
      const simNode = this.simulation?.getNodeById(data.id);
      if (simNode) {
        if (!isVisible) {
          // Fix position when hiding
          simNode.fx = simNode.x;
          simNode.fy = simNode.y;
        } else {
          // Unfix position when showing (unless being dragged)
          if (!simNode._isDragging) {
            simNode.fx = null;
            simNode.fy = null;
          }
        }
      }
    });
    
    // Update edge visibility based on connected nodes
    this.edgeElements?.forEach(({ element, data }) => {
      const sourceElement = this.nodeElements?.find(n => n.data.id === data.source);
      const targetElement = this.nodeElements?.find(n => n.data.id === data.target);
      
      const sourceVisible = sourceElement && !sourceElement.element.hasAttribute('visibility');
      const targetVisible = targetElement && !targetElement.element.hasAttribute('visibility');
      
      if (sourceVisible && targetVisible) {
        element.removeAttribute('visibility');
      } else {
        element.setAttribute('visibility', 'hidden');
      }
    });
    
    // Update node count display
    const visibleNodes = this.nodeElements?.filter(({ element }) => 
      !element.hasAttribute('visibility')
    ).length || 0;
    const totalNodes = this.nodeElements?.length || 0;
    this.updateNodeCountDisplay(visibleNodes, totalNodes);
    
    // Restart simulation if needed
    if (this.simulation && visibleNodes > 0) {
      this.simulation.options.alpha = 0.3;
      this.simulation.start();
    }
  }

  async loadGraph() {
    const graphData = await this.parseGraphData();
    console.log('Graph data parsed:', graphData);
    
    // Load saved layout if available
    this.loadLayout();
    
    this.renderGraph(graphData);
  }

  renderGraph(graphData) {
    // Track graph view
    document.dispatchEvent(new CustomEvent('graph-viewed'));
    
    // Track start time for performance metrics
    const renderStartTime = Date.now();
    
    // Clear canvas
    this.canvas.innerHTML = '';
    
    // Get dimensions
    const rect = this.canvas.getBoundingClientRect();
    
    // Decide whether to use canvas based on node count
    const nodeCount = graphData.nodes.length;
    this.useCanvas = nodeCount >= 200;
    
    if (this.useCanvas) {
      // Use canvas rendering for 200+ nodes
      this.renderGraphCanvas(graphData);
    } else {
      // Use SVG rendering for fewer nodes
      this.renderGraphSVG(graphData);
    }
    
    // Track performance metric
    const renderTime = Date.now() - renderStartTime;
    if (window.analytics) {
      window.analytics.trackPerformance('graphRender', renderTime);
    }
  }
  
  renderGraphSVG(graphData) {
    // Original SVG rendering code
    this.canvas.innerHTML = '<svg class="graph-svg"></svg>';
    const svg = this.canvas.querySelector('.graph-svg');
    
    // Set SVG dimensions
    const rect = this.canvas.getBoundingClientRect();
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    
    // Create arrow marker for directional edges (must be created before edges)
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('viewBox', '0 -5 10 10');
    marker.setAttribute('refX', '15');
    marker.setAttribute('refY', '0');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0,-5L10,0L0,5');
    path.setAttribute('fill', '#999');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);
    
    // Initialize force simulation with performance optimizations
    const nodeCount = graphData.nodes.length;
    const performanceOptions = {
      width: rect.width,
      height: rect.height,
      charge: -300,
      linkDistance: (edge) => {
        // Different distances for different edge types
        if (edge.type === 'delegates-to') return 150;
        if (edge.type === 'spawns') return 120;
        if (edge.type === 'uses') return 100;
        return 100;
      },
      // Performance: reduce alpha decay for large graphs (runs fewer iterations)
      alphaDecay: nodeCount > 50 ? 0.05 : 0.0228,
      // Performance: increase alpha min to stop simulation earlier for large graphs
      alphaMin: nodeCount > 100 ? 0.01 : 0.001
    };
    
    // Enable level of detail optimizations for 100+ nodes
    if (nodeCount > 100) {
      this.levelOfDetail.enabled = true;
      this.levelOfDetail.minZoomForLabels = 0.6;
      this.levelOfDetail.minZoomForEdges = 0.4;
      this.levelOfDetail.simplifyEdges = true;
    }
    
    this.simulation = new ForceSimulation(graphData.nodes, graphData.edges, performanceOptions);
    
    // Apply saved layout if available
    if (this.savedLayout) {
      this.applyLayout(this.savedLayout);
    }
    
    // Set up auto-save
    this.setupAutoSave();
    
    // Create edge elements
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('class', 'edges');
    svg.appendChild(edgeGroup);
    
    const edges = graphData.edges.map(edge => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', `edge edge-${edge.type}`);
      line.setAttribute('stroke', '#999');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('marker-end', 'url(#arrow)');
      edgeGroup.appendChild(line);
      return { element: line, data: edge };
    });
    
    // Create node elements
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('class', 'nodes');
    svg.appendChild(nodeGroup);
    
    const nodes = graphData.nodes.map(node => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', `node node-${node.type}`);
      group.style.cursor = 'pointer';
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '8');
      circle.setAttribute('fill', this.getNodeColor(node.type));
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '2');
      group.appendChild(circle);
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '12');
      text.setAttribute('y', '4');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#333');
      text.textContent = node.name;
      group.appendChild(text);
      
      nodeGroup.appendChild(group);
      
      // Add event listeners
      group.addEventListener('click', () => this.onNodeClick(node));
      group.addEventListener('dblclick', () => this.onNodeDoubleClick(node));
      group.addEventListener('mouseenter', () => this.onNodeHover(node));
      group.addEventListener('mouseleave', () => this.onNodeLeave(node));
      
      // Enable dragging
      this.enableDragging(group, node);
      
      return { element: group, data: node };
    });
    
    // Store references
    this.nodeElements = nodes;
    this.edgeElements = edges;
    
    // Update performance stats
    this.performanceStats.nodeCount = nodes.length;
    this.performanceStats.edgeCount = edges.length;
    
    // Update nodeMap for filter lookups
    this.nodeMap.clear();
    graphData.nodes.forEach(node => {
      this.nodeMap.set(node.id, node);
    });
    
    // Set up zoom and pan
    this.setupZoomPan(svg);
    
    // Performance optimization: batch DOM updates and add viewport culling
    let lastUpdateTime = 0;
    const updateInterval = 16; // 60fps max
    let pendingUpdate = false;
    
    // Get viewport bounds for culling
    const getViewportBounds = () => {
      const zoomGroup = svg.querySelector('.zoom-group');
      if (!zoomGroup || !this.transform) {
        return { left: -100, top: -100, right: rect.width + 100, bottom: rect.height + 100 };
      }
      
      const scale = this.transform.scale;
      const tx = this.transform.translateX;
      const ty = this.transform.translateY;
      
      return {
        left: -tx / scale - 100,
        top: -ty / scale - 100,
        right: (-tx + rect.width) / scale + 100,
        bottom: (-ty + rect.height) / scale + 100
      };
    };
    
    // Check if node is in viewport
    const isInViewport = (node, bounds) => {
      return node.x >= bounds.left && node.x <= bounds.right &&
             node.y >= bounds.top && node.y <= bounds.bottom;
    };
    
    // Batch DOM updates
    const updateDOM = () => {
      const startTime = performance.now();
      const bounds = getViewportBounds();
      const nodeCount = nodes.length;
      let visibleNodes = 0;
      let visibleEdges = 0;
      const currentScale = this.transform?.scale || 1;
      
      // Level of detail: skip edge rendering at low zoom for 100+ nodes
      const shouldRenderEdges = !this.levelOfDetail.enabled || 
                               currentScale >= this.levelOfDetail.minZoomForEdges;
      
      // Update edge positions
      if (shouldRenderEdges) {
        edges.forEach(({ element, data }) => {
          const source = this.simulation.getNodeById(data.source);
          const target = this.simulation.getNodeById(data.target);
          if (source && target) {
            // Only update if at least one endpoint is in viewport
            if (isInViewport(source, bounds) || isInViewport(target, bounds)) {
              // Simplify edge rendering for 100+ nodes at medium zoom
              if (this.levelOfDetail.simplifyEdges && nodeCount > 100 && currentScale < 0.8) {
                // Use integer coordinates for performance
                element.setAttribute('x1', Math.round(source.x));
                element.setAttribute('y1', Math.round(source.y));
                element.setAttribute('x2', Math.round(target.x));
                element.setAttribute('y2', Math.round(target.y));
              } else {
                element.setAttribute('x1', source.x);
                element.setAttribute('y1', source.y);
                element.setAttribute('x2', target.x);
                element.setAttribute('y2', target.y);
              }
              element.style.display = '';
              visibleEdges++;
            } else {
              element.style.display = 'none';
            }
          }
        });
      } else {
        // Hide all edges at very low zoom levels
        edges.forEach(({ element }) => {
          element.style.display = 'none';
        });
      }
      
      // Update node positions
      nodes.forEach(({ element, data }) => {
        const simNode = this.simulation.getNodeById(data.id);
        if (simNode) {
          if (isInViewport(simNode, bounds)) {
            element.setAttribute('transform', `translate(${simNode.x}, ${simNode.y})`);
            element.style.display = '';
            visibleNodes++;
            
            // Level of detail: hide text labels based on zoom and node count
            const textElement = element.querySelector('text');
            if (textElement) {
              const hideLabels = (this.levelOfDetail.enabled && currentScale < this.levelOfDetail.minZoomForLabels) ||
                               (nodeCount > 50 && currentScale < 0.5);
              textElement.style.display = hideLabels ? 'none' : '';
            }
          } else {
            element.style.display = 'none';
          }
        }
      });
      
      // Track performance
      const renderTime = performance.now() - startTime;
      this.performanceStats.lastRenderTime = renderTime;
      this.performanceStats.renderTimes.push(renderTime);
      
      // Keep only last 60 samples for average calculation
      if (this.performanceStats.renderTimes.length > 60) {
        this.performanceStats.renderTimes.shift();
      }
      
      // Calculate average render time
      const sum = this.performanceStats.renderTimes.reduce((a, b) => a + b, 0);
      this.performanceStats.avgRenderTime = sum / this.performanceStats.renderTimes.length;
      
      // Log performance warning if render time exceeds 16ms (60fps)
      if (nodeCount > 50 && renderTime > 16) {
        console.warn(`Graph render time: ${renderTime.toFixed(2)}ms for ${visibleNodes}/${nodeCount} nodes, ${visibleEdges}/${edges.length} edges`);
      }
      
      pendingUpdate = false;
    };
    
    // Run simulation with batched updates
    this.simulation.on('tick', () => {
      const now = performance.now();
      if (!pendingUpdate && now - lastUpdateTime >= updateInterval) {
        lastUpdateTime = now;
        pendingUpdate = true;
        requestAnimationFrame(updateDOM);
      }
    });
    
    this.simulation.start();
    
    // Initialize filters and node count
    this.updateFilters();
  }

  getNodeColor(type) {
    switch (type) {
      case 'command': return '#2196f3'; // blue
      case 'workflow': return '#4caf50'; // green
      case 'agent': return '#ff9800'; // orange
      case 'template': return '#9e9e9e'; // gray
      default: return '#757575';
    }
  }

  enableDragging(element, node) {
    let isDragging = false;
    let startX, startY;
    
    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      e.preventDefault();
      
      // Mark node as being dragged
      const simNode = this.simulation.getNodeById(node.id);
      if (simNode) {
        simNode._isDragging = true;
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const simNode = this.simulation.getNodeById(node.id);
        if (simNode) {
          simNode.x += dx;
          simNode.y += dy;
          simNode.fx = simNode.x;
          simNode.fy = simNode.y;
        }
        startX = e.clientX;
        startY = e.clientY;
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        const simNode = this.simulation.getNodeById(node.id);
        if (simNode) {
          simNode._isDragging = false;
          // Only unfix if node is visible
          if (!this.activeFilters || this.activeFilters[node.type]) {
            simNode.fx = null;
            simNode.fy = null;
          }
        }
        
        // Auto-save layout after dragging
        if (this._autoSave) {
          this._autoSave();
        }
      }
    });
  }

  setupZoomPan(svg) {
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    const minScale = 0.1;
    const maxScale = 4;
    
    // Zoom with mouse wheel
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = scale * delta;
      
      if (newScale >= minScale && newScale <= maxScale) {
        scale = newScale;
        this.updateTransform(svg, scale, translateX, translateY);
        
        // Auto-save layout after zoom
        if (this._autoSave) {
          this._autoSave();
        }
      }
    });
    
    // Pan with mouse drag
    let isPanning = false;
    let panStartX, panStartY;
    
    svg.addEventListener('mousedown', (e) => {
      if (e.target === svg) {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        svg.style.cursor = 'grab';
      }
    });
    
    svg.addEventListener('mousemove', (e) => {
      if (isPanning) {
        translateX += e.clientX - panStartX;
        translateY += e.clientY - panStartY;
        panStartX = e.clientX;
        panStartY = e.clientY;
        this.updateTransform(svg, scale, translateX, translateY);
        svg.style.cursor = 'grabbing';
      }
    });
    
    svg.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        svg.style.cursor = 'auto';
        
        // Auto-save layout after pan
        if (this._autoSave) {
          this._autoSave();
        }
      }
    });
  }

  updateTransform(svg, scale, translateX, translateY) {
    const g = svg.querySelector('.nodes').parentElement;
    if (!g.classList.contains('zoom-group')) {
      // Wrap nodes and edges in a zoom group
      const zoomGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      zoomGroup.setAttribute('class', 'zoom-group');
      const nodes = svg.querySelector('.nodes');
      const edges = svg.querySelector('.edges');
      zoomGroup.appendChild(edges);
      zoomGroup.appendChild(nodes);
      svg.appendChild(zoomGroup);
    }
    
    const zoomGroup = svg.querySelector('.zoom-group');
    zoomGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
    
    // Store transform for viewport culling calculations
    this.transform = { scale, translateX, translateY };
  }

  onNodeClick(node) {
    // Highlight connected nodes and edges
    const connectedNodes = new Set();
    const connectedEdges = new Set();
    
    this.edgeElements.forEach(({ element, data }) => {
      if (data.source === node.id) {
        connectedNodes.add(data.target);
        connectedEdges.add(element);
        element.classList.add('highlighted');
      } else if (data.target === node.id) {
        connectedNodes.add(data.source);
        connectedEdges.add(element);
        element.classList.add('highlighted');
      } else {
        element.classList.remove('highlighted');
      }
    });
    
    this.nodeElements.forEach(({ element, data }) => {
      if (data.id === node.id || connectedNodes.has(data.id)) {
        element.classList.add('highlighted');
      } else {
        element.classList.remove('highlighted');
      }
    });
  }

  onNodeDoubleClick(node) {
    // Open file in editor
    window.dispatchEvent(new CustomEvent('open-file', {
      detail: { path: node.path }
    }));
  }

  onNodeHover(node) {
    // Show tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'graph-tooltip';
    tooltip.textContent = `${node.name} (${node.type})`;
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '4px 8px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    document.body.appendChild(tooltip);
    
    const updateTooltipPosition = (e) => {
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY - 30 + 'px';
    };
    
    document.addEventListener('mousemove', updateTooltipPosition);
    this._tooltipMouseMoveHandler = updateTooltipPosition;
    this._currentTooltip = tooltip;
  }

  onNodeLeave(node) {
    if (this._currentTooltip) {
      this._currentTooltip.remove();
      this._currentTooltip = null;
    }
    if (this._tooltipMouseMoveHandler) {
      document.removeEventListener('mousemove', this._tooltipMouseMoveHandler);
      this._tooltipMouseMoveHandler = null;
    }
  }
  
  // Get performance statistics
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      quadtreeEnabled: this.simulation?.useQuadtree || false,
      levelOfDetailEnabled: this.levelOfDetail.enabled,
      canvasRenderingEnabled: this.useCanvas,
      optimizationsActive: {
        quadtree: this.simulation?.useQuadtree || false,
        levelOfDetail: this.levelOfDetail.enabled,
        viewportCulling: true,
        batchedUpdates: true,
        simplifiedEdges: this.levelOfDetail.simplifyEdges,
        canvasRendering: this.useCanvas
      },
      recommendations: this.getPerformanceRecommendations()
    };
  }
  
  getPerformanceRecommendations() {
    const recommendations = [];
    const nodeCount = this.performanceStats.nodeCount;
    
    if (nodeCount > 200) {
      recommendations.push('Consider using canvas rendering instead of SVG for 200+ nodes');
    }
    
    if (this.performanceStats.avgRenderTime > 16) {
      recommendations.push('Average render time exceeds 16ms - consider reducing visible nodes');
    }
    
    if (nodeCount > 100 && !this.levelOfDetail.enabled) {
      recommendations.push('Enable level of detail optimizations for better performance');
    }
    
    return recommendations;
  }
  
  // Save current layout to localStorage
  saveLayout() {
    const layoutData = {
      version: 1,
      timestamp: Date.now(),
      transform: this.useCanvas ? this.canvasTransform : this.transform,
      filters: this.activeFilters,
      nodePositions: {}
    };
    
    // Save node positions
    if (this.simulation) {
      this.nodes.forEach(node => {
        const simNode = this.simulation.getNodeById(node.id);
        if (simNode) {
          layoutData.nodePositions[node.id] = {
            x: simNode.x,
            y: simNode.y,
            fx: simNode.fx,
            fy: simNode.fy
          };
        }
      });
    }
    
    // Save to localStorage
    try {
      localStorage.setItem(this.layoutStorageKey, JSON.stringify(layoutData));
      return true;
    } catch (e) {
      console.error('Failed to save layout:', e);
      return false;
    }
  }
  
  // Load layout from localStorage
  loadLayout() {
    try {
      const stored = localStorage.getItem(this.layoutStorageKey);
      if (stored) {
        this.savedLayout = JSON.parse(stored);
        return this.savedLayout;
      }
    } catch (e) {
      console.error('Failed to load layout:', e);
    }
    return null;
  }
  
  // Apply saved layout to current graph
  applyLayout(layoutData) {
    if (!layoutData) return;
    
    // Apply transform
    if (layoutData.transform) {
      if (this.useCanvas) {
        this.canvasTransform = { ...layoutData.transform };
      } else if (this.transform) {
        this.transform = { ...layoutData.transform };
        const svg = this.canvas.querySelector('.graph-svg');
        if (svg) {
          this.updateTransform(svg, this.transform.scale, this.transform.translateX, this.transform.translateY);
        }
      }
    }
    
    // Apply filters
    if (layoutData.filters) {
      Object.entries(layoutData.filters).forEach(([type, checked]) => {
        const checkbox = this.container.querySelector(`.filter-${type}s`);
        if (checkbox) {
          checkbox.checked = checked;
        }
      });
      this.activeFilters = layoutData.filters;
    }
    
    // Apply node positions
    if (layoutData.nodePositions && this.simulation) {
      Object.entries(layoutData.nodePositions).forEach(([nodeId, position]) => {
        const simNode = this.simulation.getNodeById(nodeId);
        if (simNode) {
          simNode.x = position.x || simNode.x;
          simNode.y = position.y || simNode.y;
          // Only apply fixed positions if they were set
          if (position.fx !== null) simNode.fx = position.fx;
          if (position.fy !== null) simNode.fy = position.fy;
        }
      });
    }
  }
  
  // Clear saved layout
  clearLayout() {
    try {
      localStorage.removeItem(this.layoutStorageKey);
      this.savedLayout = null;
      return true;
    } catch (e) {
      console.error('Failed to clear layout:', e);
      return false;
    }
  }
  
  // Auto-save with debouncing
  setupAutoSave() {
    let saveTimeout;
    const autoSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.saveLayout();
      }, 1000); // Save 1 second after last change
    };
    
    // Store reference for cleanup
    this._autoSave = autoSave;
    return autoSave;
  }
  
  // Canvas rendering implementation for 200+ nodes
  renderGraphCanvas(graphData) {
    // Create canvas element
    const canvasElement = document.createElement('canvas');
    canvasElement.className = 'graph-canvas';
    canvasElement.width = this.canvas.clientWidth;
    canvasElement.height = this.canvas.clientHeight;
    this.canvas.appendChild(canvasElement);
    
    this.canvasElement = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    // Store dimensions
    const rect = this.canvas.getBoundingClientRect();
    
    // Initialize force simulation with aggressive optimizations
    const performanceOptions = {
      width: rect.width,
      height: rect.height,
      charge: -300,
      linkDistance: (edge) => {
        if (edge.type === 'delegates-to') return 150;
        if (edge.type === 'spawns') return 120;
        if (edge.type === 'uses') return 100;
        return 100;
      },
      // Aggressive optimizations for 200+ nodes
      alphaDecay: 0.1, // Much faster decay
      alphaMin: 0.05, // Stop simulation earlier
      velocityDecay: 0.2 // More damping
    };
    
    this.simulation = new ForceSimulation(graphData.nodes, graphData.edges, performanceOptions);
    
    // Apply saved layout if available
    if (this.savedLayout) {
      this.applyLayout(this.savedLayout);
    }
    
    // Set up auto-save
    this.setupAutoSave();
    
    // Update nodeMap
    this.nodeMap.clear();
    graphData.nodes.forEach(node => {
      this.nodeMap.set(node.id, node);
    });
    
    // Store references for interaction
    this.canvasNodes = graphData.nodes;
    this.canvasEdges = graphData.edges;
    
    // Set up canvas transform state
    this.canvasTransform = {
      scale: 1,
      translateX: 0,
      translateY: 0
    };
    
    // Set up canvas event handlers
    this.setupCanvasEvents(canvasElement);
    
    // Animation loop for canvas
    let animationId;
    const animate = () => {
      this.drawCanvas();
      animationId = requestAnimationFrame(animate);
    };
    
    // Start simulation
    this.simulation.on('tick', () => {
      // No need to do anything here, drawing is handled by animation loop
    });
    
    this.simulation.start();
    animate();
    
    // Store animation ID for cleanup
    this._canvasAnimationId = animationId;
    
    // Initialize filters and node count
    this.updateFilters();
  }
  
  drawCanvas() {
    const ctx = this.ctx;
    const canvas = this.canvasElement;
    const transform = this.canvasTransform;
    
    // Performance tracking
    const startTime = performance.now();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    
    // Apply transformation
    ctx.translate(transform.translateX, transform.translateY);
    ctx.scale(transform.scale, transform.scale);
    
    // Draw edges (skip at very low zoom)
    if (transform.scale > 0.2) {
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1 / transform.scale; // Keep constant visual width
      ctx.globalAlpha = 0.6;
      
      this.canvasEdges.forEach(edge => {
        const source = this.simulation.getNodeById(edge.source);
        const target = this.simulation.getNodeById(edge.target);
        
        if (source && target) {
          // Check if nodes are filtered
          const sourceNode = this.nodeMap.get(edge.source);
          const targetNode = this.nodeMap.get(edge.target);
          const filters = this.activeFilters || { command: true, workflow: true, agent: true, template: true };
          
          if (filters[sourceNode?.type] && filters[targetNode?.type]) {
            // Highlight check
            const isHighlighted = this.canvasHighlightedEdges.has(`${edge.source}-${edge.target}`);
            if (isHighlighted) {
              ctx.strokeStyle = '#333';
              ctx.lineWidth = 3 / transform.scale;
              ctx.globalAlpha = 1;
            }
            
            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            
            // Draw arrow (simplified for performance)
            if (transform.scale > 0.5) {
              const angle = Math.atan2(target.y - source.y, target.x - source.x);
              const arrowLength = 10 / transform.scale;
              const nodeRadius = this.canvasNodeRadius;
              const endX = target.x - Math.cos(angle) * nodeRadius;
              const endY = target.y - Math.sin(angle) * nodeRadius;
              
              ctx.beginPath();
              ctx.moveTo(endX, endY);
              ctx.lineTo(endX - arrowLength * Math.cos(angle - Math.PI/6), 
                        endY - arrowLength * Math.sin(angle - Math.PI/6));
              ctx.moveTo(endX, endY);
              ctx.lineTo(endX - arrowLength * Math.cos(angle + Math.PI/6), 
                        endY - arrowLength * Math.sin(angle + Math.PI/6));
              ctx.stroke();
            }
            
            // Reset styles
            if (isHighlighted) {
              ctx.strokeStyle = '#999';
              ctx.lineWidth = 1 / transform.scale;
              ctx.globalAlpha = 0.6;
            }
          }
        }
      });
    }
    
    // Draw nodes
    ctx.globalAlpha = 1;
    this.canvasNodes.forEach(node => {
      const simNode = this.simulation.getNodeById(node.id);
      if (!simNode) return;
      
      const filters = this.activeFilters || { command: true, workflow: true, agent: true, template: true };
      if (!filters[node.type]) return;
      
      // Check search query
      if (this._canvasSearchQuery && !node.name.toLowerCase().includes(this._canvasSearchQuery)) {
        return;
      }
      
      // Node circle
      ctx.beginPath();
      ctx.arc(simNode.x, simNode.y, this.canvasNodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = this.getNodeColor(node.type);
      ctx.fill();
      
      // Highlight check
      if (this.canvasHighlightedNodes.has(node.id)) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3 / transform.scale;
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 / transform.scale;
        ctx.stroke();
      }
      
      // Draw text labels only at reasonable zoom levels
      if (transform.scale > 0.4) {
        ctx.fillStyle = '#333';
        ctx.font = `${12 / transform.scale}px sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name, simNode.x + 10, simNode.y);
      }
      
      // Hover highlight
      if (this.canvasHoveredNode === node.id) {
        ctx.beginPath();
        ctx.arc(simNode.x, simNode.y, this.canvasNodeRadius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2 / transform.scale;
        ctx.stroke();
      }
    });
    
    // Restore context
    ctx.restore();
    
    // Update performance stats
    const renderTime = performance.now() - startTime;
    this.performanceStats.lastRenderTime = renderTime;
    this.performanceStats.renderTimes.push(renderTime);
    if (this.performanceStats.renderTimes.length > 60) {
      this.performanceStats.renderTimes.shift();
    }
    const sum = this.performanceStats.renderTimes.reduce((a, b) => a + b, 0);
    this.performanceStats.avgRenderTime = sum / this.performanceStats.renderTimes.length;
  }
  
  setupCanvasEvents(canvas) {
    let isDragging = false;
    let isPanning = false;
    let draggedNode = null;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    // Convert mouse coordinates to graph coordinates
    const mouseToGraph = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const transform = this.canvasTransform;
      return {
        x: (x - transform.translateX) / transform.scale,
        y: (y - transform.translateY) / transform.scale
      };
    };
    
    // Find node at position
    const getNodeAt = (x, y) => {
      for (const node of this.canvasNodes) {
        const simNode = this.simulation.getNodeById(node.id);
        if (simNode) {
          const dx = simNode.x - x;
          const dy = simNode.y - y;
          if (dx * dx + dy * dy <= this.canvasNodeRadius * this.canvasNodeRadius) {
            return node;
          }
        }
      }
      return null;
    };
    
    // Mouse down
    canvas.addEventListener('mousedown', (e) => {
      const pos = mouseToGraph(e);
      const node = getNodeAt(pos.x, pos.y);
      
      if (node) {
        isDragging = true;
        draggedNode = node;
        const simNode = this.simulation.getNodeById(node.id);
        if (simNode) {
          simNode._isDragging = true;
        }
      } else {
        isPanning = true;
        canvas.style.cursor = 'grab';
      }
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      e.preventDefault();
    });
    
    // Mouse move
    canvas.addEventListener('mousemove', (e) => {
      const pos = mouseToGraph(e);
      
      if (isDragging && draggedNode) {
        const simNode = this.simulation.getNodeById(draggedNode.id);
        if (simNode) {
          simNode.x = pos.x;
          simNode.y = pos.y;
          simNode.fx = pos.x;
          simNode.fy = pos.y;
        }
      } else if (isPanning) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        this.canvasTransform.translateX += dx;
        this.canvasTransform.translateY += dy;
        canvas.style.cursor = 'grabbing';
      } else {
        // Hover detection
        const node = getNodeAt(pos.x, pos.y);
        if (node) {
          canvas.style.cursor = 'pointer';
          if (this.canvasHoveredNode !== node.id) {
            this.canvasHoveredNode = node.id;
            this.onNodeHover(node);
          }
        } else {
          canvas.style.cursor = 'default';
          if (this.canvasHoveredNode) {
            this.canvasHoveredNode = null;
            this.onNodeLeave(null);
          }
        }
      }
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });
    
    // Mouse up
    canvas.addEventListener('mouseup', (e) => {
      if (isDragging && draggedNode) {
        const simNode = this.simulation.getNodeById(draggedNode.id);
        if (simNode) {
          simNode._isDragging = false;
          simNode.fx = null;
          simNode.fy = null;
        }
        
        // Auto-save layout after dragging
        if (this._autoSave) {
          this._autoSave();
        }
      }
      
      if (isPanning && this._autoSave) {
        // Auto-save layout after panning
        this._autoSave();
      }
      
      isDragging = false;
      isPanning = false;
      draggedNode = null;
      canvas.style.cursor = 'default';
    });
    
    // Click
    canvas.addEventListener('click', (e) => {
      const pos = mouseToGraph(e);
      const node = getNodeAt(pos.x, pos.y);
      if (node) {
        this.onNodeClickCanvas(node);
      }
    });
    
    // Double click
    canvas.addEventListener('dblclick', (e) => {
      const pos = mouseToGraph(e);
      const node = getNodeAt(pos.x, pos.y);
      if (node) {
        this.onNodeDoubleClick(node);
      }
    });
    
    // Wheel for zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = this.canvasTransform.scale * delta;
      
      if (newScale >= 0.1 && newScale <= 4) {
        // Zoom towards mouse position
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const transform = this.canvasTransform;
        
        // Calculate new translate to keep mouse position fixed
        transform.translateX = mouseX - (mouseX - transform.translateX) * delta;
        transform.translateY = mouseY - (mouseY - transform.translateY) * delta;
        transform.scale = newScale;
        
        // Auto-save layout after zoom
        if (this._autoSave) {
          this._autoSave();
        }
      }
    });
  }
  
  onNodeClickCanvas(node) {
    // Clear previous highlights
    this.canvasHighlightedNodes.clear();
    this.canvasHighlightedEdges.clear();
    
    // Highlight clicked node
    this.canvasHighlightedNodes.add(node.id);
    
    // Find and highlight connected nodes and edges
    this.canvasEdges.forEach(edge => {
      if (edge.source === node.id) {
        this.canvasHighlightedNodes.add(edge.target);
        this.canvasHighlightedEdges.add(`${edge.source}-${edge.target}`);
      } else if (edge.target === node.id) {
        this.canvasHighlightedNodes.add(edge.source);
        this.canvasHighlightedEdges.add(`${edge.source}-${edge.target}`);
      }
    });
  }
  
  // Override updateFilters for canvas support
  updateFilters() {
    if (this.useCanvas) {
      // Canvas-specific filter update
      const filters = {
        command: this.container.querySelector('.filter-commands').checked,
        workflow: this.container.querySelector('.filter-workflows').checked,
        agent: this.container.querySelector('.filter-agents').checked,
        template: this.container.querySelector('.filter-templates').checked
      };
      
      this.activeFilters = filters;
      
      // Update node count
      const visibleNodes = this.canvasNodes?.filter(node => filters[node.type]).length || 0;
      const totalNodes = this.canvasNodes?.length || 0;
      this.updateNodeCountDisplay(visibleNodes, totalNodes);
      
      // Force redraw
      this.drawCanvas();
      
      // Auto-save layout after filter change
      if (this._autoSave) {
        this._autoSave();
      }
    } else {
      // Original SVG filter update code
      const filters = {
        command: this.container.querySelector('.filter-commands').checked,
        workflow: this.container.querySelector('.filter-workflows').checked,
        agent: this.container.querySelector('.filter-agents').checked,
        template: this.container.querySelector('.filter-templates').checked
      };

      // Store filter state
      this.activeFilters = filters;
      
      // Get current search query
      const searchInput = this.container.querySelector('.graph-search');
      const searchQuery = searchInput?.value?.toLowerCase().trim() || '';

      // Apply filters to nodes
      this.nodeElements?.forEach(({ element, data }) => {
        const typeFilterActive = filters[data.type];
        const nameMatches = !searchQuery || data.name.toLowerCase().includes(searchQuery);
        const isVisible = typeFilterActive && nameMatches;
        
        // Use SVG visibility attribute instead of display style
        if (isVisible) {
          element.removeAttribute('visibility');
          element.classList.remove('filtered-out');
        } else {
          element.setAttribute('visibility', 'hidden');
          element.classList.add('filtered-out');
        }
        
        // Update simulation node to stop physics on hidden nodes
        const simNode = this.simulation?.getNodeById(data.id);
        if (simNode) {
          if (!isVisible) {
            // Fix position when hiding
            simNode.fx = simNode.x;
            simNode.fy = simNode.y;
          } else {
            // Unfix position when showing (unless being dragged)
            if (!simNode._isDragging) {
              simNode.fx = null;
              simNode.fy = null;
            }
          }
        }
      });

      // Apply filters to edges (hide edges where source or target is hidden)
      this.edgeElements?.forEach(({ element, data }) => {
        const sourceNode = this.nodeMap.get(data.source);
        const targetNode = this.nodeMap.get(data.target);
        const isVisible = filters[sourceNode?.type] && filters[targetNode?.type];
        
        // Use SVG visibility attribute
        if (isVisible) {
          element.removeAttribute('visibility');
          element.classList.remove('filtered-out');
        } else {
          element.setAttribute('visibility', 'hidden');
          element.classList.add('filtered-out');
        }
      });

      // Update visible node count display
      const visibleNodes = this.nodeElements?.filter(({ data }) => filters[data.type]).length || 0;
      const totalNodes = this.nodeElements?.length || 0;
      this.updateNodeCountDisplay(visibleNodes, totalNodes);

      // Restart simulation with lower alpha for smooth repositioning
      if (this.simulation && visibleNodes > 0) {
        this.simulation.options.alpha = 0.3;
        this.simulation.start();
      }
      
      // Auto-save layout after filter change
      if (this._autoSave) {
        this._autoSave();
      }
    }
  }
  
  // Override searchNodes for canvas support
  searchNodes(query) {
    if (this.useCanvas) {
      // Canvas search is handled by updateFilters redraw
      const searchQuery = query.toLowerCase().trim();
      this._canvasSearchQuery = searchQuery;
      this.drawCanvas();
    } else {
      // Original SVG search code
      const searchQuery = query.toLowerCase().trim();
      
      // If query is empty, show all nodes (respecting filters)
      if (!searchQuery) {
        this.updateFilters();
        return;
      }
      
      // Apply search filter to nodes
      this.nodeElements?.forEach(({ element, data }) => {
        // Check if node type is filtered out
        const typeFilterActive = this.activeFilters && this.activeFilters[data.type];
        
        // Check if node name matches search query
        const nameMatches = data.name.toLowerCase().includes(searchQuery);
        
        // Node is visible if it matches search AND type filter is active
        const isVisible = nameMatches && typeFilterActive;
        
        // Apply visibility
        if (isVisible) {
          element.removeAttribute('visibility');
          element.classList.remove('filtered-out');
          element.classList.remove('search-filtered');
        } else {
          element.setAttribute('visibility', 'hidden');
          element.classList.add('filtered-out');
          if (!nameMatches) {
            element.classList.add('search-filtered');
          }
        }
        
        // Update simulation node
        const simNode = this.simulation?.getNodeById(data.id);
        if (simNode) {
          if (!isVisible) {
            // Fix position when hiding
            simNode.fx = simNode.x;
            simNode.fy = simNode.y;
          } else {
            // Unfix position when showing (unless being dragged)
            if (!simNode._isDragging) {
              simNode.fx = null;
              simNode.fy = null;
            }
          }
        }
      });
      
      // Update edge visibility based on connected nodes
      this.edgeElements?.forEach(({ element, data }) => {
        const sourceElement = this.nodeElements?.find(n => n.data.id === data.source);
        const targetElement = this.nodeElements?.find(n => n.data.id === data.target);
        
        const sourceVisible = sourceElement && !sourceElement.element.hasAttribute('visibility');
        const targetVisible = targetElement && !targetElement.element.hasAttribute('visibility');
        
        if (sourceVisible && targetVisible) {
          element.removeAttribute('visibility');
        } else {
          element.setAttribute('visibility', 'hidden');
        }
      });
      
      // Update node count display
      const visibleNodes = this.nodeElements?.filter(({ element }) => 
        !element.hasAttribute('visibility')
      ).length || 0;
      const totalNodes = this.nodeElements?.length || 0;
      this.updateNodeCountDisplay(visibleNodes, totalNodes);
      
      // Restart simulation if needed
      if (this.simulation && visibleNodes > 0) {
        this.simulation.options.alpha = 0.3;
        this.simulation.start();
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphViewer;
}