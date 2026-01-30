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
    
    // Apply forces
    this.applyForceCharge();
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
    this.setupHTML();
  }

  setupHTML() {
    this.container.innerHTML = `
      <div class="graph-viewer">
        <div class="graph-header">
          <h2>System Graph</h2>
          <div class="graph-filters">
            <label><input type="checkbox" class="filter-commands" checked> Commands</label>
            <label><input type="checkbox" class="filter-workflows" checked> Workflows</label>
            <label><input type="checkbox" class="filter-agents" checked> Agents</label>
            <label><input type="checkbox" class="filter-templates" checked> Templates</label>
          </div>
          <input type="text" class="graph-search" placeholder="Search nodes...">
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
    // Implementation for filter updates
    console.log('Filters updated');
  }

  searchNodes(query) {
    // Implementation for node search
    console.log('Searching for:', query);
  }

  async loadGraph() {
    const graphData = await this.parseGraphData();
    console.log('Graph data parsed:', graphData);
    this.renderGraph(graphData);
  }

  renderGraph(graphData) {
    // Clear canvas
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
    
    // Initialize force simulation
    this.simulation = new ForceSimulation(graphData.nodes, graphData.edges, {
      width: rect.width,
      height: rect.height,
      charge: -300,
      linkDistance: (edge) => {
        // Different distances for different edge types
        if (edge.type === 'delegates-to') return 150;
        if (edge.type === 'spawns') return 120;
        if (edge.type === 'uses') return 100;
        return 100;
      }
    });
    
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
    
    // Set up zoom and pan
    this.setupZoomPan(svg);
    
    // Run simulation
    this.simulation.on('tick', () => {
      // Update edge positions
      edges.forEach(({ element, data }) => {
        const source = this.simulation.getNodeById(data.source);
        const target = this.simulation.getNodeById(data.target);
        if (source && target) {
          element.setAttribute('x1', source.x);
          element.setAttribute('y1', source.y);
          element.setAttribute('x2', target.x);
          element.setAttribute('y2', target.y);
        }
      });
      
      // Update node positions
      nodes.forEach(({ element, data }) => {
        const simNode = this.simulation.getNodeById(data.id);
        if (simNode) {
          element.setAttribute('transform', `translate(${simNode.x}, ${simNode.y})`);
        }
      });
    });
    
    this.simulation.start();
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
          simNode.fx = null;
          simNode.fy = null;
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
      isPanning = false;
      svg.style.cursor = 'auto';
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphViewer;
}