// Quick open file dialog component (Cmd/Ctrl+P)
class QuickOpen {
  constructor() {
    this.isOpen = false;
    this.files = [];
    this.filteredFiles = [];
    this.selectedIndex = 0;
    this.setupHTML();
    this.setupEventListeners();
    this.loadFiles();
  }
  
  setupHTML() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'quick-open-overlay';
    overlay.style.display = 'none';
    
    overlay.innerHTML = `
      <div class="quick-open-modal">
        <input type="text" class="quick-open-input" placeholder="Type to search files...">
        <div class="quick-open-results">
          <div class="quick-open-list"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    this.overlay = overlay;
    this.modal = overlay.querySelector('.quick-open-modal');
    this.input = overlay.querySelector('.quick-open-input');
    this.list = overlay.querySelector('.quick-open-list');
  }
  
  setupEventListeners() {
    // Global keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        this.toggle();
      }
    });
    
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
    
    // Input change
    this.input.addEventListener('input', () => {
      this.filterFiles();
    });
    
    // Keyboard navigation
    this.input.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectPrevious();
          break;
        case 'Enter':
          e.preventDefault();
          this.openSelected();
          break;
        case 'Escape':
          e.preventDefault();
          this.close();
          break;
      }
    });
    
    // Mouse hover
    this.list.addEventListener('mousemove', (e) => {
      const item = e.target.closest('.quick-open-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        if (!isNaN(index)) {
          this.selectedIndex = index;
          this.updateSelection();
        }
      }
    });
    
    // Mouse click
    this.list.addEventListener('click', (e) => {
      const item = e.target.closest('.quick-open-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        if (!isNaN(index)) {
          this.selectedIndex = index;
          this.openSelected();
        }
      }
    });
    
    // Listen for file tree updates
    if (window.sseClient) {
      window.sseClient.on('message', (data) => {
        if (data.type === 'fileChange') {
          // Reload files on any file change
          this.loadFiles();
        }
      });
    }
  }
  
  async loadFiles() {
    // Show skeleton loader if dialog is open
    if (this.isOpen) {
      this.showLoadingSkeleton();
    }
    
    try {
      if (window.api) {
        const tree = await window.api.loadTree();
        this.files = this.flattenTree(tree);
        // Update filtered files if dialog is open
        if (this.isOpen) {
          this.filterFiles();
        }
      }
    } catch (error) {
      console.error('Failed to load files for quick open:', error);
      if (this.isOpen) {
        this.showError('Failed to load files');
      }
    }
  }
  
  showLoadingSkeleton() {
    const skeletonHTML = `
      <div class="quick-open-skeleton skeleton-fade-in">
        ${Array(5).fill('').map((_, i) => `
          <div class="quick-open-skeleton-item">
            <div class="skeleton quick-open-skeleton-name"></div>
            <div class="skeleton quick-open-skeleton-path"></div>
          </div>
        `).join('')}
      </div>
    `;
    this.list.innerHTML = skeletonHTML;
  }
  
  showError(message) {
    this.list.innerHTML = `
      <div class="quick-open-empty" style="color: #f44336;">
        ${message}
      </div>
    `;
  }
  
  flattenTree(node, basePath = '') {
    const files = [];
    
    if (node.type === 'file') {
      files.push({
        name: node.name,
        path: basePath ? `${basePath}/${node.name}` : node.name
      });
    }
    
    if (node.children) {
      for (const child of node.children) {
        const childPath = basePath ? `${basePath}/${node.name}` : node.name;
        files.push(...this.flattenTree(child, childPath));
      }
    }
    
    return files;
  }
  
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open() {
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.input.value = '';
    this.input.focus();
    
    // Track quick open usage
    document.dispatchEvent(new CustomEvent('quick-open-used'));
    
    // Show skeleton if no files loaded yet
    if (this.files.length === 0) {
      this.showLoadingSkeleton();
      this.loadFiles();
    } else {
      this.filterFiles();
    }
  }
  
  close() {
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.input.value = '';
  }
  
  filterFiles() {
    const query = this.input.value.toLowerCase();
    
    if (!query) {
      // Show all files if no query
      this.filteredFiles = [...this.files];
    } else {
      // Score and filter files
      this.filteredFiles = this.files
        .map(file => {
          const score = this.scoreMatch(file, query);
          return { ...file, score };
        })
        .filter(file => file.score > 0)
        .sort((a, b) => b.score - a.score);
    }
    
    // Reset selection
    this.selectedIndex = 0;
    this.renderResults();
  }
  
  scoreMatch(file, query) {
    const fileName = file.name.toLowerCase();
    const filePath = file.path.toLowerCase();
    let score = 0;
    
    // Exact filename match
    if (fileName === query) {
      score += 100;
    }
    
    // Filename starts with query
    if (fileName.startsWith(query)) {
      score += 50;
    }
    
    // Filename contains query
    if (fileName.includes(query)) {
      score += 25;
    }
    
    // Path contains query
    if (filePath.includes(query)) {
      score += 10;
    }
    
    // Fuzzy match
    let queryIndex = 0;
    let lastMatchIndex = -1;
    for (let i = 0; i < fileName.length && queryIndex < query.length; i++) {
      if (fileName[i] === query[queryIndex]) {
        queryIndex++;
        // Bonus for consecutive matches
        if (lastMatchIndex === i - 1) {
          score += 5;
        }
        lastMatchIndex = i;
        score += 1;
      }
    }
    
    // Only count as match if all query chars were found
    if (queryIndex !== query.length) {
      return 0;
    }
    
    return score;
  }
  
  renderResults() {
    const maxResults = 20;
    const resultsToShow = this.filteredFiles.slice(0, maxResults);
    
    if (resultsToShow.length === 0) {
      this.list.innerHTML = '<div class="quick-open-empty">No files found</div>';
      return;
    }
    
    const html = resultsToShow.map((file, index) => {
      const selected = index === this.selectedIndex ? 'selected' : '';
      const fileName = this.escapeHtml(file.name);
      const filePath = this.escapeHtml(file.path);
      
      // Highlight matching characters
      const highlightedName = this.highlightMatch(fileName, this.input.value);
      const highlightedPath = this.highlightMatch(filePath, this.input.value);
      
      return `
        <div class="quick-open-item ${selected}" data-index="${index}">
          <div class="quick-open-item-name">${highlightedName}</div>
          <div class="quick-open-item-path">${highlightedPath}</div>
        </div>
      `;
    }).join('');
    
    this.list.innerHTML = html;
  }
  
  highlightMatch(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<span class="quick-open-match">$1</span>');
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  updateSelection() {
    const items = this.list.querySelectorAll('.quick-open-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedIndex);
    });
    
    // Scroll selected item into view
    const selectedItem = items[this.selectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }
  
  selectNext() {
    if (this.filteredFiles.length > 0) {
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredFiles.length - 1);
      this.updateSelection();
    }
  }
  
  selectPrevious() {
    if (this.filteredFiles.length > 0) {
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.updateSelection();
    }
  }
  
  openSelected() {
    if (this.filteredFiles.length > 0 && this.selectedIndex < this.filteredFiles.length) {
      const file = this.filteredFiles[this.selectedIndex];
      this.openFile(file.path);
      this.close();
    }
  }
  
  openFile(path) {
    // Dispatch open-file event
    const event = new CustomEvent('open-file', {
      detail: { path }
    });
    window.dispatchEvent(event);
  }
}

// Initialize quick open when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.quickOpen = new QuickOpen();
});