// File tree component with virtual scrolling and request debouncing
class FileTree {
  constructor(container) {
    this.container = container;
    this.tree = null;
    this.selectedFile = null;
    this.unsavedFiles = new Set();
    this.expandedDirs = new Set();
    
    // Debouncing configuration
    this.loadDebounceDelay = 300; // 300ms delay for load operations
    this.expandDebounceDelay = 100; // 100ms delay for expand/collapse operations
    this.loadDebounceTimer = null;
    this.expandDebounceTimers = new Map();
    
    // Virtual scrolling configuration
    this.itemHeight = 24; // Height of each tree item in pixels
    this.visibleItems = [];
    this.scrollTop = 0;
    this.containerHeight = 0;
    
    this.setupHTML();
    this.setupEventListeners();
  }
  
  setupHTML() {
    this.container.innerHTML = `
      <div class="file-tree">
        <div class="file-tree-header">
          <h3>Files</h3>
          <button class="refresh-btn" title="Refresh">↻</button>
        </div>
        <div class="file-tree-search">
          <input type="text" placeholder="Search files..." class="file-search-input">
        </div>
        <div class="file-tree-container">
          <div class="file-tree-viewport">
            <div class="file-tree-content"></div>
          </div>
        </div>
      </div>
    `;
    
    this.searchInput = this.container.querySelector('.file-search-input');
    this.refreshBtn = this.container.querySelector('.refresh-btn');
    this.treeContainer = this.container.querySelector('.file-tree-container');
    this.viewport = this.container.querySelector('.file-tree-viewport');
    this.content = this.container.querySelector('.file-tree-content');
  }
  
  setupEventListeners() {
    // Refresh button with debouncing
    this.refreshBtn.addEventListener('click', () => {
      this.debouncedLoadTree();
    });
    
    // Search input with debouncing
    this.searchInput.addEventListener('input', () => {
      this.debouncedRenderTree();
    });
    
    // Virtual scrolling
    this.viewport.addEventListener('scroll', () => {
      this.handleScroll();
    });
    
    // Keyboard navigation
    this.content.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
    
    // File selection
    this.content.addEventListener('click', (e) => {
      this.handleClick(e);
    });
    
    // Window resize
    window.addEventListener('resize', () => {
      this.updateContainerHeight();
      this.renderVisibleItems();
    });
    
    // SSE file change events
    if (window.sseClient) {
      window.sseClient.on('message', (data) => {
        if (data.type === 'fileChange') {
          // Debounce file change updates
          this.debouncedHandleFileChange(data.path);
        }
      });
    }
  }
  
  // Debounced load tree method
  debouncedLoadTree() {
    // Clear existing timer
    if (this.loadDebounceTimer) {
      clearTimeout(this.loadDebounceTimer);
    }
    
    // Show loading state immediately
    this.showLoading();
    
    // Set new timer
    this.loadDebounceTimer = setTimeout(async () => {
      try {
        await this.loadTree();
      } catch (error) {
        this.showError(error);
      }
    }, this.loadDebounceDelay);
  }
  
  // Debounced render tree method
  debouncedRenderTree() {
    // Clear existing timer
    if (this.renderDebounceTimer) {
      clearTimeout(this.renderDebounceTimer);
    }
    
    // Set new timer
    this.renderDebounceTimer = setTimeout(() => {
      this.renderTree();
    }, 100);
  }
  
  // Debounced expand/collapse method
  debouncedToggleDir(path) {
    // Clear existing timer for this path
    if (this.expandDebounceTimers.has(path)) {
      clearTimeout(this.expandDebounceTimers.get(path));
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.toggleDir(path);
      this.expandDebounceTimers.delete(path);
    }, this.expandDebounceDelay);
    
    this.expandDebounceTimers.set(path, timer);
  }
  
  // Debounced file change handler
  debouncedHandleFileChange(path) {
    if (!this.fileChangeDebounceTimer) {
      this.fileChangeDebounceTimer = {};
    }
    
    // Clear existing timer for this file
    if (this.fileChangeDebounceTimer[path]) {
      clearTimeout(this.fileChangeDebounceTimer[path]);
    }
    
    // Set new timer
    this.fileChangeDebounceTimer[path] = setTimeout(() => {
      // Only refresh the tree if the changed file is visible
      const needsRefresh = this.isFileVisible(path);
      if (needsRefresh) {
        this.debouncedLoadTree();
      }
      delete this.fileChangeDebounceTimer[path];
    }, 500); // 500ms delay for file changes
  }
  
  async loadTree() {
    try {
      const tree = await window.api.loadTree();
      this.tree = tree;
      this.renderTree();
      this.hideLoading();
    } catch (error) {
      console.error('Failed to load file tree:', error);
      this.showError(error);
      throw error;
    }
  }
  
  renderTree() {
    if (!this.tree) return;
    
    const searchQuery = this.searchInput.value.toLowerCase();
    this.visibleItems = this.flattenTree(this.tree, searchQuery);
    
    // Update container dimensions
    this.updateContainerHeight();
    
    // Set content height for scrollbar
    this.content.style.height = `${this.visibleItems.length * this.itemHeight}px`;
    
    // Render only visible items
    this.renderVisibleItems();
  }
  
  flattenTree(node, searchQuery = '', path = '', level = 0) {
    const items = [];
    
    // Add the current node if it matches search
    if (!searchQuery || this.matchesSearch(node.name, path, searchQuery)) {
      items.push({
        name: node.name,
        path: path || node.name,
        type: node.type,
        level: level,
        hasChildren: node.children && node.children.length > 0,
        isExpanded: this.expandedDirs.has(path || node.name)
      });
      
      // Process children if directory is expanded
      if (node.children && this.expandedDirs.has(path || node.name)) {
        for (const child of node.children) {
          const childPath = path ? `${path}/${child.name}` : child.name;
          items.push(...this.flattenTree(child, searchQuery, childPath, level + 1));
        }
      }
    } else if (node.children && searchQuery) {
      // If searching, check children even if parent doesn't match
      for (const child of node.children) {
        const childPath = path ? `${path}/${child.name}` : child.name;
        const childItems = this.flattenTree(child, searchQuery, childPath, level);
        if (childItems.length > 0) {
          // Add parent if children match
          items.push({
            name: node.name,
            path: path || node.name,
            type: node.type,
            level: level,
            hasChildren: true,
            isExpanded: true
          });
          items.push(...childItems);
          break;
        }
      }
    }
    
    return items;
  }
  
  matchesSearch(name, path, query) {
    return name.toLowerCase().includes(query) || 
           path.toLowerCase().includes(query);
  }
  
  renderVisibleItems() {
    const scrollTop = this.viewport.scrollTop;
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.ceil((scrollTop + this.containerHeight) / this.itemHeight);
    
    // Clear content
    this.content.innerHTML = '';
    
    // Render visible items with buffer
    const bufferSize = 5;
    const renderStart = Math.max(0, startIndex - bufferSize);
    const renderEnd = Math.min(this.visibleItems.length, endIndex + bufferSize);
    
    // Create a container for visible items
    const fragment = document.createDocumentFragment();
    
    for (let i = renderStart; i < renderEnd; i++) {
      const item = this.visibleItems[i];
      const element = this.createTreeItem(item);
      element.style.position = 'absolute';
      element.style.top = `${i * this.itemHeight}px`;
      element.style.left = '0';
      element.style.right = '0';
      fragment.appendChild(element);
    }
    
    this.content.appendChild(fragment);
  }
  
  createTreeItem(item) {
    const div = document.createElement('div');
    div.className = `tree-item ${item.type} ${item.path === this.selectedFile ? 'selected' : ''}`;
    div.style.paddingLeft = `${item.level * 16 + 8}px`;
    div.dataset.path = item.path;
    div.dataset.type = item.type;
    
    // Add expand/collapse arrow for directories
    if (item.type === 'directory' && item.hasChildren) {
      const arrow = document.createElement('span');
      arrow.className = 'tree-arrow';
      arrow.textContent = item.isExpanded ? '▼' : '▶';
      arrow.onclick = (e) => {
        e.stopPropagation();
        this.debouncedToggleDir(item.path);
      };
      div.appendChild(arrow);
    }
    
    // Add icon
    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = this.getFileIcon(item.name, item.type);
    div.appendChild(icon);
    
    // Add name
    const name = document.createElement('span');
    name.className = 'tree-name';
    name.textContent = item.name;
    div.appendChild(name);
    
    // Add unsaved indicator
    if (this.unsavedFiles.has(item.path)) {
      const dot = document.createElement('span');
      dot.className = 'unsaved-dot';
      dot.textContent = '●';
      div.appendChild(dot);
    }
    
    return div;
  }
  
  getFileIcon(name, type) {
    if (type === 'directory') return '📁';
    if (name.endsWith('.js')) return '📄';
    if (name.endsWith('.json')) return '🔧';
    if (name.endsWith('.md')) return '📝';
    if (name.endsWith('.html')) return '🌐';
    if (name.endsWith('.css')) return '🎨';
    return '📄';
  }
  
  toggleDir(path) {
    if (this.expandedDirs.has(path)) {
      this.expandedDirs.delete(path);
    } else {
      this.expandedDirs.add(path);
    }
    this.renderTree();
  }
  
  handleScroll() {
    this.scrollTop = this.viewport.scrollTop;
    requestAnimationFrame(() => {
      this.renderVisibleItems();
    });
  }
  
  handleClick(e) {
    const item = e.target.closest('.tree-item');
    if (!item) return;
    
    const path = item.dataset.path;
    const type = item.dataset.type;
    
    if (type === 'directory') {
      this.debouncedToggleDir(path);
    } else {
      this.selectFile(path);
      this.openFile(path);
    }
  }
  
  handleKeyDown(e) {
    const selected = this.content.querySelector('.tree-item.selected');
    if (!selected) return;
    
    const currentIndex = this.visibleItems.findIndex(item => item.path === selected.dataset.path);
    let newIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(this.visibleItems.length - 1, currentIndex + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (selected.dataset.type === 'directory' && this.expandedDirs.has(selected.dataset.path)) {
          this.debouncedToggleDir(selected.dataset.path);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (selected.dataset.type === 'directory' && !this.expandedDirs.has(selected.dataset.path)) {
          this.debouncedToggleDir(selected.dataset.path);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (selected.dataset.type === 'directory') {
          this.debouncedToggleDir(selected.dataset.path);
        } else {
          this.openFile(selected.dataset.path);
        }
        break;
    }
    
    if (newIndex !== currentIndex) {
      const newItem = this.visibleItems[newIndex];
      this.selectFile(newItem.path);
      this.ensureItemVisible(newIndex);
    }
  }
  
  selectFile(path) {
    this.selectedFile = path;
    this.renderVisibleItems();
  }
  
  openFile(path) {
    const event = new CustomEvent('open-file', {
      detail: { path }
    });
    window.dispatchEvent(event);
  }
  
  markFileUnsaved(path) {
    this.unsavedFiles.add(path);
    this.renderVisibleItems();
  }
  
  markFileSaved(path) {
    this.unsavedFiles.delete(path);
    this.renderVisibleItems();
  }
  
  ensureItemVisible(index) {
    const itemTop = index * this.itemHeight;
    const itemBottom = itemTop + this.itemHeight;
    const viewportTop = this.viewport.scrollTop;
    const viewportBottom = viewportTop + this.containerHeight;
    
    if (itemTop < viewportTop) {
      this.viewport.scrollTop = itemTop;
    } else if (itemBottom > viewportBottom) {
      this.viewport.scrollTop = itemBottom - this.containerHeight;
    }
  }
  
  updateContainerHeight() {
    this.containerHeight = this.viewport.clientHeight;
  }
  
  isFileVisible(path) {
    // Check if file or its parent directory is in visible items
    return this.visibleItems.some(item => 
      item.path === path || path.startsWith(item.path + '/')
    );
  }
  
  showLoading() {
    // Show skeleton loader for file tree
    const skeletonHTML = `
      <div class="file-tree-skeleton skeleton-fade-in">
        ${this.generateTreeSkeletonItems(8)}
      </div>
    `;
    this.content.innerHTML = skeletonHTML;
  }
  
  generateTreeSkeletonItems(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
      const level = Math.floor(Math.random() * 3); // Random indentation level
      const hasArrow = level > 0 && Math.random() > 0.5;
      const widthClass = ['short', 'medium', 'long'][Math.floor(Math.random() * 3)];
      
      html += `
        <div class="file-tree-skeleton-item" style="padding-left: ${level * 16 + 8}px;">
          ${hasArrow ? '<div class="skeleton file-tree-skeleton-arrow"></div>' : ''}
          <div class="skeleton file-tree-skeleton-icon"></div>
          <div class="skeleton file-tree-skeleton-name ${widthClass}"></div>
        </div>
      `;
    }
    return html;
  }
  
  hideLoading() {
    // Rendering will clear the loading message
  }
  
  showError(error) {
    this.content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  }
}