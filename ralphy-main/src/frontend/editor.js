class MarkdownEditor {
  constructor(container) {
    this.container = container;
    this.textarea = null;
    this.lineNumbers = null;
    this.statusBar = null;
    this.saveTimeout = null;
    this.saveDebounceTime = 2000;
    this.isDirty = false;
    this.currentFile = null;
    this.currentContent = '';
    this.findBar = null;
    this.currentFindIndex = -1;
    this.findMatches = [];
    this.highlightLayer = null;
    this.highlightTimeout = null;
    this.highlightDebounceTime = 100;
    
    // Vim mode state
    this.vimEnabled = false;
    this.vimMode = 'normal'; // 'normal', 'insert', 'visual'
    this.vimKeyBuffer = '';
    this.vimCommandTimeout = null;
    this.vimVisualStart = null;
    this.vimVisualEnd = null;
    this.vimLastMotion = null;
    this.vimRegisters = { default: '' };
    
    this.setupEditor();
    this.setupKeyboardShortcuts();
    this.loadVimPreference();
  }

  setupEditor() {
    // Create editor structure
    this.container.innerHTML = `
      <div class="editor-container">
        <div class="find-bar" id="find-bar" style="display: none;" role="search" aria-label="Find and replace">
          <div class="find-controls">
            <input type="text" id="find-input" placeholder="Find..." class="find-input" aria-label="Find text" role="searchbox">
            <span class="find-results" aria-live="polite" aria-atomic="true">0/0</span>
            <button class="find-prev" title="Previous match (Shift+Enter)" aria-label="Previous match">↑</button>
            <button class="find-next" title="Next match (Enter)" aria-label="Next match">↓</button>
            <label class="regex-toggle">
              <input type="checkbox" id="regex-checkbox" aria-label="Use regular expressions">
              <span title="Use regular expressions">.*</span>
            </label>
            <button class="replace-toggle" title="Toggle replace" aria-label="Toggle replace mode" aria-expanded="false">▼</button>
            <button class="find-close" title="Close (Esc)" aria-label="Close find and replace">×</button>
          </div>
          <div class="replace-controls" id="replace-controls" style="display: none;">
            <input type="text" id="replace-input" placeholder="Replace..." class="replace-input" aria-label="Replace text">
            <button class="replace-current" title="Replace current match" aria-label="Replace current match">Replace</button>
            <button class="replace-all" title="Replace all matches" aria-label="Replace all matches">Replace All</button>
          </div>
        </div>
        <div class="editor-content">
          <div class="line-numbers" aria-hidden="true"></div>
          <div class="editor-wrapper">
            <div class="highlight-layer" aria-hidden="true"></div>
            <textarea class="editor-textarea" wrap="off" spellcheck="false" aria-label="Code editor" role="textbox" aria-multiline="true"></textarea>
          </div>
        </div>
        <div class="status-bar" role="status">
          <span class="file-path" aria-label="Current file"></span>
          <span class="vim-mode-indicator" aria-live="polite" aria-atomic="true"></span>
          <span class="save-status" aria-live="polite" aria-atomic="true">Ready</span>
          <label class="vim-toggle">
            <input type="checkbox" id="vim-checkbox" aria-label="Toggle Vim mode">
            <span>Vim</span>
          </label>
        </div>
      </div>
    `;

    // Get references to elements
    this.textarea = this.container.querySelector('.editor-textarea');
    this.lineNumbers = this.container.querySelector('.line-numbers');
    this.statusBar = this.container.querySelector('.status-bar');
    this.findBar = this.container.querySelector('#find-bar');
    this.findInput = this.container.querySelector('#find-input');
    this.findResults = this.container.querySelector('.find-results');
    this.replaceInput = this.container.querySelector('#replace-input');
    this.replaceControls = this.container.querySelector('#replace-controls');
    this.regexCheckbox = this.container.querySelector('#regex-checkbox');
    this.useRegex = false;
    this.highlightLayer = this.container.querySelector('.highlight-layer');
    this.vimCheckbox = this.container.querySelector('#vim-checkbox');
    this.vimModeIndicator = this.container.querySelector('.vim-mode-indicator');

    // Set up event listeners
    this.textarea.addEventListener('input', () => this.handleInput());
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    
    // Vim mode toggle
    this.vimCheckbox.addEventListener('change', () => {
      this.toggleVimMode();
    });
    
    // Sync highlight layer dimensions with textarea
    const syncDimensions = () => {
      const { width, height } = this.textarea.getBoundingClientRect();
      this.highlightLayer.style.width = width + 'px';
      this.highlightLayer.style.height = height + 'px';
    };
    window.addEventListener('resize', syncDimensions);
    syncDimensions();
    
    // Find functionality event listeners
    this.findInput.addEventListener('input', () => this.performFind());
    this.findInput.addEventListener('keydown', (e) => this.handleFindKeydown(e));
    
    this.container.querySelector('.find-next').addEventListener('click', () => this.findNext());
    this.container.querySelector('.find-prev').addEventListener('click', () => this.findPrevious());
    this.container.querySelector('.find-close').addEventListener('click', () => this.closeFindBar());
    
    // Replace functionality event listeners
    this.replaceInput.addEventListener('keydown', (e) => this.handleReplaceKeydown(e));
    this.container.querySelector('.replace-toggle').addEventListener('click', () => this.toggleReplaceBar());
    this.container.querySelector('.replace-current').addEventListener('click', () => this.replaceCurrent());
    this.container.querySelector('.replace-all').addEventListener('click', () => this.replaceAll());
    
    // Regex toggle
    this.regexCheckbox.addEventListener('change', () => {
      this.useRegex = this.regexCheckbox.checked;
      this.performFind();
    });

    // Initial line numbers
    this.updateLineNumbers();
  }

  setupKeyboardShortcuts() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Handle vim mode first if enabled
      if (this.vimEnabled && document.activeElement === this.textarea) {
        if (this.handleVimKeyboard(e)) {
          return; // Vim handled the key
        }
      }
      
      // Cmd/Ctrl+F - Open find
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        this.openFindBar();
      }
      
      // Cmd/Ctrl+H - Open replace
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        this.openFindBar(true);
      }

      // Cmd/Ctrl+S - Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        this.save();
      }

      // Tab - Insert 2 spaces
      if (e.key === 'Tab' && document.activeElement === this.textarea) {
        e.preventDefault();
        this.insertAtCursor('  ');
      }

      // Escape - Close find bar if open
      if (e.key === 'Escape' && this.findBar.style.display !== 'none') {
        e.preventDefault();
        this.closeFindBar();
      }
    });
  }

  openFindBar(showReplace = false) {
    this.findBar.style.display = 'block';
    if (showReplace) {
      this.replaceControls.style.display = 'block';
      // Track replace usage
      document.dispatchEvent(new CustomEvent('replace-used'));
    } else {
      // Track find usage
      document.dispatchEvent(new CustomEvent('find-opened'));
    }
    this.findInput.focus();
    this.findInput.select();
    this.performFind();
  }

  closeFindBar() {
    this.findBar.style.display = 'none';
    this.replaceControls.style.display = 'none';
    this.clearFindHighlights();
    this.textarea.focus();
  }
  
  toggleReplaceBar() {
    const isVisible = this.replaceControls.style.display !== 'none';
    this.replaceControls.style.display = isVisible ? 'none' : 'block';
    
    // Update aria-expanded attribute
    const toggleButton = this.container.querySelector('.replace-toggle');
    toggleButton.setAttribute('aria-expanded', !isVisible ? 'true' : 'false');
    
    if (!isVisible) {
      this.replaceInput.focus();
    }
  }

  performFind() {
    const searchText = this.findInput.value;
    if (!searchText) {
      this.findMatches = [];
      this.currentFindIndex = -1;
      this.updateFindResults();
      this.clearFindHighlights();
      return;
    }

    const content = this.textarea.value;
    this.findMatches = [];
    
    if (this.useRegex) {
      // Regex search
      try {
        const regex = new RegExp(searchText, 'g');
        let match;
        while ((match = regex.exec(content)) !== null) {
          this.findMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0]
          });
          // Prevent infinite loop for zero-width matches
          if (match[0].length === 0) {
            regex.lastIndex++;
          }
        }
      } catch (e) {
        // Invalid regex - clear matches
        this.findMatches = [];
      }
    } else {
      // Plain text search
      let index = 0;
      while (index < content.length) {
        const matchIndex = content.toLowerCase().indexOf(searchText.toLowerCase(), index);
        if (matchIndex === -1) break;
        
        this.findMatches.push({
          start: matchIndex,
          end: matchIndex + searchText.length,
          text: content.substring(matchIndex, matchIndex + searchText.length)
        });
        
        index = matchIndex + 1;
      }
    }

    if (this.findMatches.length > 0) {
      this.currentFindIndex = 0;
      this.highlightMatch(0);
    } else {
      this.currentFindIndex = -1;
    }
    
    this.updateFindResults();
  }

  findNext() {
    if (this.findMatches.length === 0) return;
    
    this.currentFindIndex = (this.currentFindIndex + 1) % this.findMatches.length;
    this.highlightMatch(this.currentFindIndex);
    this.updateFindResults();
  }

  findPrevious() {
    if (this.findMatches.length === 0) return;
    
    this.currentFindIndex = this.currentFindIndex - 1;
    if (this.currentFindIndex < 0) {
      this.currentFindIndex = this.findMatches.length - 1;
    }
    
    this.highlightMatch(this.currentFindIndex);
    this.updateFindResults();
  }

  highlightMatch(index) {
    if (index < 0 || index >= this.findMatches.length) return;
    
    const match = this.findMatches[index];
    
    // Select the match in the textarea
    this.textarea.setSelectionRange(match.start, match.end);
    
    // Scroll to make the match visible
    const lineHeight = 20; // Approximate line height
    const linesBeforeCursor = this.textarea.value.substring(0, match.start).split('\n').length - 1;
    const scrollTop = linesBeforeCursor * lineHeight;
    
    // Center the match in the viewport if possible
    const editorHeight = this.textarea.clientHeight;
    const targetScroll = scrollTop - (editorHeight / 2) + lineHeight;
    
    this.textarea.scrollTop = Math.max(0, targetScroll);
  }

  clearFindHighlights() {
    // Clear any selection
    if (this.textarea.selectionStart !== this.textarea.selectionEnd) {
      const currentPos = this.textarea.selectionEnd;
      this.textarea.setSelectionRange(currentPos, currentPos);
    }
  }

  updateFindResults() {
    if (this.findMatches.length === 0) {
      this.findResults.textContent = '0/0';
    } else {
      const current = this.currentFindIndex + 1;
      this.findResults.textContent = `${current}/${this.findMatches.length}`;
    }
  }

  handleFindKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        this.findPrevious();
      } else {
        this.findNext();
      }
    }
  }
  
  handleReplaceKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.replaceCurrent();
    }
  }
  
  replaceCurrent() {
    if (this.currentFindIndex < 0 || this.currentFindIndex >= this.findMatches.length) {
      return;
    }
    
    const replaceText = this.replaceInput.value;
    const match = this.findMatches[this.currentFindIndex];
    const content = this.textarea.value;
    
    // Replace the current match
    const newContent = content.substring(0, match.start) + 
                      replaceText + 
                      content.substring(match.end);
    
    this.textarea.value = newContent;
    
    // Adjust remaining matches
    const lengthDiff = replaceText.length - match.text.length;
    for (let i = this.currentFindIndex + 1; i < this.findMatches.length; i++) {
      this.findMatches[i].start += lengthDiff;
      this.findMatches[i].end += lengthDiff;
    }
    
    // Remove current match and re-find from this position
    this.findMatches.splice(this.currentFindIndex, 1);
    
    // If there are remaining matches, highlight the next one
    if (this.findMatches.length > 0) {
      if (this.currentFindIndex >= this.findMatches.length) {
        this.currentFindIndex = 0;
      }
      this.highlightMatch(this.currentFindIndex);
    } else {
      this.currentFindIndex = -1;
    }
    
    this.updateFindResults();
    this.handleInput(); // Mark as dirty and trigger auto-save
  }
  
  replaceAll() {
    if (this.findMatches.length === 0) {
      return;
    }
    
    const searchText = this.findInput.value;
    const replaceText = this.replaceInput.value;
    let content = this.textarea.value;
    
    if (this.useRegex) {
      try {
        const regex = new RegExp(searchText, 'g');
        content = content.replace(regex, replaceText);
      } catch (e) {
        return; // Invalid regex
      }
    } else {
      // Replace all occurrences (case-insensitive)
      const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      content = content.replace(regex, replaceText);
    }
    
    this.textarea.value = content;
    this.performFind(); // Re-find to update matches
    this.handleInput(); // Mark as dirty and trigger auto-save
  }

  handleInput() {
    this.isDirty = true;
    this.updateLineNumbers();
    this.updateStatus('Unsaved');
    
    // Debounced auto-save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.save(), this.saveDebounceTime);
    
    // Debounced syntax highlighting
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    this.highlightTimeout = setTimeout(() => this.updateSyntaxHighlighting(), this.highlightDebounceTime);
  }

  syncScroll() {
    this.lineNumbers.scrollTop = this.textarea.scrollTop;
    this.highlightLayer.scrollTop = this.textarea.scrollTop;
    this.highlightLayer.scrollLeft = this.textarea.scrollLeft;
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split('\n').length;
    const numbers = [];
    for (let i = 1; i <= lines; i++) {
      numbers.push(`<div class="line-number">${i}</div>`);
    }
    this.lineNumbers.innerHTML = numbers.join('');
  }

  insertAtCursor(text) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const value = this.textarea.value;
    
    this.textarea.value = value.substring(0, start) + text + value.substring(end);
    this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
    
    this.handleInput();
  }

  showLoadingSkeleton(path) {
    // Update status bar
    this.container.querySelector('.file-path').textContent = path;
    this.updateStatus('Loading...');
    
    // Show skeleton in editor
    const editorWrapper = this.container.querySelector('.editor-wrapper');
    const skeletonHTML = `
      <div class="editor-skeleton skeleton-fade-in" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #fff; z-index: 10; padding: 10px;" role="status" aria-label="Loading file">
        <span class="sr-only">Loading file ${path}...</span>
        <div class="editor-skeleton-toolbar">
          <div class="skeleton skeleton-button"></div>
          <div class="skeleton skeleton-button"></div>
          <div class="skeleton skeleton-button"></div>
        </div>
        ${this.generateEditorSkeletonLines(15)}
      </div>
    `;
    
    // Create skeleton overlay
    const skeletonDiv = document.createElement('div');
    skeletonDiv.innerHTML = skeletonHTML;
    this.skeletonOverlay = skeletonDiv.firstElementChild;
    editorWrapper.appendChild(this.skeletonOverlay);
    
    // Hide textarea and line numbers temporarily
    this.textarea.style.opacity = '0';
    this.lineNumbers.style.opacity = '0';
  }
  
  generateEditorSkeletonLines(count) {
    let html = '';
    const widthClasses = ['full', 'long', 'medium', 'short'];
    
    for (let i = 0; i < count; i++) {
      const widthClass = widthClasses[Math.floor(Math.random() * widthClasses.length)];
      html += `<div class="skeleton editor-skeleton-line ${widthClass}"></div>`;
      
      // Add occasional blank lines for more realistic code appearance
      if (Math.random() > 0.7) {
        html += '<div style="height: 20px;"></div>';
      }
    }
    
    return html;
  }
  
  showError(message) {
    // Remove skeleton if present
    this.hideLoadingSkeleton();
    
    // Show error in editor
    const errorHTML = `
      <div class="editor-error" style="padding: 40px; text-align: center; color: #f44336;" role="alert" aria-live="assertive">
        <h3>Error Loading File</h3>
        <p>${message}</p>
      </div>
    `;
    
    this.textarea.value = '';
    this.updateLineNumbers();
    this.updateStatus('Error');
    
    // Show error overlay
    const editorWrapper = this.container.querySelector('.editor-wrapper');
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = errorHTML;
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.right = '0';
    errorDiv.style.bottom = '0';
    errorDiv.style.background = '#fff';
    errorDiv.style.zIndex = '10';
    editorWrapper.appendChild(errorDiv);
    
    // Remove error after 5 seconds
    setTimeout(() => errorDiv.remove(), 5000);
  }
  
  hideLoadingSkeleton() {
    if (this.skeletonOverlay) {
      this.skeletonOverlay.remove();
      this.skeletonOverlay = null;
    }
    
    // Restore textarea and line numbers opacity
    this.textarea.style.opacity = '1';
    this.lineNumbers.style.opacity = '1';
  }

  loadFile(path, content) {
    this.hideLoadingSkeleton();
    this.currentFile = path;
    this.currentContent = content;
    this.textarea.value = content;
    this.isDirty = false;
    this.updateLineNumbers();
    this.updateStatus('Saved');
    this.container.querySelector('.file-path').textContent = path;
    this.updateSyntaxHighlighting();
  }

  async save() {
    if (!this.currentFile || !this.isDirty) return;
    
    this.updateStatus('Saving...');
    
    // Track file save
    document.dispatchEvent(new CustomEvent('file-saved'));
    
    try {
      await window.api.saveFile(this.currentFile, this.textarea.value, {
        onSuccess: () => {
          this.isDirty = false;
          this.currentContent = this.textarea.value;
          this.updateStatus('Saved');
        },
        onError: (error) => {
          console.error('Failed to save file:', error);
          this.updateStatus('Save failed');
        }
      });
    } catch (error) {
      // Operation was queued
      this.updateStatus('Save queued');
    }
  }

  updateStatus(status) {
    this.statusBar.querySelector('.save-status').textContent = status;
  }

  handleExternalChange(newContent) {
    if (this.isDirty) {
      // TODO: Show conflict resolution UI
      console.warn('External change detected while file has unsaved changes');
    } else {
      this.textarea.value = newContent;
      this.currentContent = newContent;
      this.updateLineNumbers();
      this.updateSyntaxHighlighting();
    }
  }

  updateSyntaxHighlighting() {
    const content = this.textarea.value;
    if (!content) {
      this.highlightLayer.innerHTML = '';
      return;
    }

    // Process content line by line
    const lines = content.split('\n');
    const highlightedLines = lines.map(line => this.highlightLine(line));
    
    // Join with line breaks and wrap in pre tag to maintain formatting
    this.highlightLayer.innerHTML = `<pre class="highlight-content">${highlightedLines.join('\n')}</pre>`;
  }

  highlightLine(line) {
    // Escape HTML
    let html = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Headers (h1-h6)
    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^(#{1,6})\s/)[1].length;
      html = html.replace(/^(#{1,6}\s)(.*)$/, `<span class="md-header md-h${level}">$1$2</span>`);
    }
    
    // Bold text
    html = html.replace(/\*\*([^*]+)\*\*/g, '<span class="md-bold">**$1**</span>');
    html = html.replace(/__([^_]+)__/g, '<span class="md-bold">__$1__</span>');
    
    // Italic text
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<span class="md-italic">*$1*</span>');
    html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<span class="md-italic">_$1_</span>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<span class="md-code">`$1`</span>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="md-link">[$1]($2)</span>');
    
    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span class="md-image">![$1]($2)</span>');
    
    // Lists
    if (/^[\s]*[-*+]\s/.test(line)) {
      html = html.replace(/^([\s]*)([-*+]\s)/, '$1<span class="md-list">$2</span>');
    }
    
    // Ordered lists
    if (/^[\s]*\d+\.\s/.test(line)) {
      html = html.replace(/^([\s]*)(\d+\.\s)/, '$1<span class="md-list">$2</span>');
    }
    
    // Blockquotes
    if (/^>/.test(line)) {
      html = `<span class="md-blockquote">${html}</span>`;
    }
    
    // Code blocks (simple detection for lines starting with 4 spaces or tab)
    if (/^(\t|    )/.test(line)) {
      html = `<span class="md-code-block">${html}</span>`;
    }
    
    // Triple backticks for code blocks
    if (/^```/.test(line)) {
      html = `<span class="md-fence">${html}</span>`;
    }
    
    // Horizontal rule
    if (/^([-_*]){3,}\s*$/.test(line)) {
      html = `<span class="md-hr">${html}</span>`;
    }
    
    // Task lists
    html = html.replace(/^([\s]*)(- \[[ x]\])/, '$1<span class="md-task">$2</span>');
    
    return html || '&nbsp;'; // Return non-breaking space for empty lines
  }

  // Vim mode methods
  loadVimPreference() {
    const savedPref = localStorage.getItem('vim-mode-enabled');
    if (savedPref === 'true') {
      this.vimCheckbox.checked = true;
      this.toggleVimMode();
    }
  }

  toggleVimMode() {
    this.vimEnabled = this.vimCheckbox.checked;
    localStorage.setItem('vim-mode-enabled', this.vimEnabled);
    
    // Track vim mode usage
    if (this.vimEnabled) {
      document.dispatchEvent(new CustomEvent('vim-mode-toggled'));
    }
    
    if (this.vimEnabled) {
      this.vimMode = 'normal';
      this.updateVimModeIndicator();
      // Remove regular input handler to prevent conflicts
      this.textarea.style.caretColor = this.vimMode === 'insert' ? 'black' : 'transparent';
    } else {
      this.vimModeIndicator.textContent = '';
      this.textarea.style.caretColor = 'black';
    }
  }

  updateVimModeIndicator() {
    let mode = '';
    switch (this.vimMode) {
      case 'normal':
        mode = '-- NORMAL --';
        break;
      case 'insert':
        mode = '-- INSERT --';
        break;
      case 'visual':
        mode = '-- VISUAL --';
        break;
    }
    this.vimModeIndicator.textContent = mode;
    this.textarea.style.caretColor = this.vimMode === 'insert' ? 'black' : 'transparent';
  }

  handleVimKeyboard(e) {
    // Don't handle if modifiers are pressed (except shift for capital letters)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return false;
    }

    switch (this.vimMode) {
      case 'normal':
        return this.handleVimNormalMode(e);
      case 'insert':
        return this.handleVimInsertMode(e);
      case 'visual':
        return this.handleVimVisualMode(e);
    }
    
    return false;
  }

  handleVimNormalMode(e) {
    e.preventDefault();
    
    // Add key to buffer
    this.vimKeyBuffer += e.key;
    
    // Clear timeout for multi-key commands
    if (this.vimCommandTimeout) {
      clearTimeout(this.vimCommandTimeout);
    }
    
    // Motion commands
    if (this.vimKeyBuffer === 'h') { // Left
      this.moveCursor(-1, 0);
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'j') { // Down
      this.moveCursor(0, 1);
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'k') { // Up
      this.moveCursor(0, -1);
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'l') { // Right
      this.moveCursor(1, 0);
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'w') { // Word forward
      this.moveWord(1);
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'b') { // Word backward
      this.moveWord(-1);
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === '0') { // Start of line
      this.moveToLineStart();
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === '$') { // End of line
      this.moveToLineEnd();
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'g' && this.vimKeyBuffer.length === 1) {
      // Wait for next key
    } else if (this.vimKeyBuffer === 'gg') { // Start of file
      this.moveToFileStart();
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'G') { // End of file
      this.moveToFileEnd();
      this.clearVimKeyBuffer();
    }
    // Mode switching
    else if (this.vimKeyBuffer === 'i') { // Insert mode
      this.vimMode = 'insert';
      this.updateVimModeIndicator();
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'a') { // Append mode
      this.moveCursor(1, 0);
      this.vimMode = 'insert';
      this.updateVimModeIndicator();
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'o') { // Open line below
      this.moveToLineEnd();
      this.insertAtCursor('\n');
      this.vimMode = 'insert';
      this.updateVimModeIndicator();
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'O') { // Open line above
      this.moveToLineStart();
      this.insertAtCursor('\n');
      this.moveCursor(0, -1);
      this.vimMode = 'insert';
      this.updateVimModeIndicator();
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'v') { // Visual mode
      this.vimMode = 'visual';
      this.vimVisualStart = this.textarea.selectionStart;
      this.vimVisualEnd = this.textarea.selectionEnd;
      this.updateVimModeIndicator();
      this.clearVimKeyBuffer();
    }
    // Delete commands
    else if (this.vimKeyBuffer === 'x') { // Delete character
      const start = this.textarea.selectionStart;
      const end = start + 1;
      const text = this.textarea.value;
      if (start < text.length) {
        this.textarea.value = text.substring(0, start) + text.substring(end);
        this.textarea.setSelectionRange(start, start);
        this.handleInput();
      }
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'd' && this.vimKeyBuffer.length === 1) {
      // Wait for motion
    } else if (this.vimKeyBuffer === 'dd') { // Delete line
      this.deleteLine();
      this.clearVimKeyBuffer();
    }
    // Yank commands
    else if (this.vimKeyBuffer === 'y' && this.vimKeyBuffer.length === 1) {
      // Wait for motion
    } else if (this.vimKeyBuffer === 'yy') { // Yank line
      this.yankLine();
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'p') { // Paste after
      this.pasteAfter();
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'P') { // Paste before
      this.pasteBefore();
      this.clearVimKeyBuffer();
    }
    // Undo/Redo
    else if (this.vimKeyBuffer === 'u') { // Undo
      document.execCommand('undo');
      this.clearVimKeyBuffer();
    } else if (this.vimKeyBuffer === 'Ctrl-r' || (e.ctrlKey && e.key === 'r')) { // Redo
      document.execCommand('redo');
      this.clearVimKeyBuffer();
      return true;
    }
    // Search
    else if (this.vimKeyBuffer === '/') { // Search forward
      this.openFindBar();
      this.clearVimKeyBuffer();
    }
    else {
      // Set timeout to clear buffer if no match
      this.vimCommandTimeout = setTimeout(() => {
        this.clearVimKeyBuffer();
      }, 1000);
    }
    
    return true;
  }

  handleVimInsertMode(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.vimMode = 'normal';
      this.updateVimModeIndicator();
      // Move cursor back one if possible
      const pos = this.textarea.selectionStart;
      if (pos > 0) {
        this.textarea.setSelectionRange(pos - 1, pos - 1);
      }
      return true;
    }
    // Let normal input handling occur
    return false;
  }

  handleVimVisualMode(e) {
    e.preventDefault();
    
    if (e.key === 'Escape') {
      this.vimMode = 'normal';
      this.updateVimModeIndicator();
      const pos = this.textarea.selectionStart;
      this.textarea.setSelectionRange(pos, pos);
      this.vimVisualStart = null;
      this.vimVisualEnd = null;
      return true;
    }
    
    // Visual mode motions
    const oldPos = this.textarea.selectionEnd;
    let newPos = oldPos;
    
    if (e.key === 'h') { // Left
      newPos = Math.max(0, oldPos - 1);
    } else if (e.key === 'j') { // Down
      const lines = this.textarea.value.split('\n');
      const currentLine = this.textarea.value.substring(0, oldPos).split('\n').length - 1;
      if (currentLine < lines.length - 1) {
        const currentCol = oldPos - this.textarea.value.lastIndexOf('\n', oldPos - 1) - 1;
        const nextLineStart = this.textarea.value.indexOf('\n', oldPos) + 1;
        newPos = Math.min(nextLineStart + currentCol, this.textarea.value.length);
      }
    } else if (e.key === 'k') { // Up
      const lines = this.textarea.value.split('\n');
      const currentLine = this.textarea.value.substring(0, oldPos).split('\n').length - 1;
      if (currentLine > 0) {
        const currentCol = oldPos - this.textarea.value.lastIndexOf('\n', oldPos - 1) - 1;
        const prevLineEnd = this.textarea.value.lastIndexOf('\n', oldPos - 1);
        const prevLineStart = this.textarea.value.lastIndexOf('\n', prevLineEnd - 1) + 1;
        newPos = Math.min(prevLineStart + currentCol, prevLineEnd);
      }
    } else if (e.key === 'l') { // Right
      newPos = Math.min(this.textarea.value.length, oldPos + 1);
    } else if (e.key === 'y') { // Yank selection
      this.yankSelection();
      this.vimMode = 'normal';
      this.updateVimModeIndicator();
      return true;
    } else if (e.key === 'd') { // Delete selection
      this.deleteSelection();
      this.vimMode = 'normal';
      this.updateVimModeIndicator();
      return true;
    }
    
    // Update selection
    if (newPos !== oldPos) {
      if (newPos < this.vimVisualStart) {
        this.textarea.setSelectionRange(newPos, this.vimVisualStart);
      } else {
        this.textarea.setSelectionRange(this.vimVisualStart, newPos);
      }
    }
    
    return true;
  }

  clearVimKeyBuffer() {
    this.vimKeyBuffer = '';
    if (this.vimCommandTimeout) {
      clearTimeout(this.vimCommandTimeout);
      this.vimCommandTimeout = null;
    }
  }

  // Vim motion helpers
  moveCursor(dx, dy) {
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value;
    const lines = text.split('\n');
    const currentLine = text.substring(0, pos).split('\n').length - 1;
    const currentCol = pos - text.lastIndexOf('\n', pos - 1) - 1;
    
    if (dy !== 0) {
      const newLine = Math.max(0, Math.min(lines.length - 1, currentLine + dy));
      if (newLine !== currentLine) {
        let newPos = 0;
        for (let i = 0; i < newLine; i++) {
          newPos += lines[i].length + 1;
        }
        newPos += Math.min(currentCol, lines[newLine].length);
        this.textarea.setSelectionRange(newPos, newPos);
      }
    } else if (dx !== 0) {
      const newPos = Math.max(0, Math.min(text.length, pos + dx));
      this.textarea.setSelectionRange(newPos, newPos);
    }
  }

  moveWord(direction) {
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value;
    let newPos = pos;
    
    if (direction > 0) { // Forward
      // Skip current word
      while (newPos < text.length && /\w/.test(text[newPos])) newPos++;
      // Skip spaces
      while (newPos < text.length && /\s/.test(text[newPos])) newPos++;
    } else { // Backward
      if (newPos > 0) newPos--;
      // Skip spaces
      while (newPos > 0 && /\s/.test(text[newPos])) newPos--;
      // Find word start
      while (newPos > 0 && /\w/.test(text[newPos - 1])) newPos--;
    }
    
    this.textarea.setSelectionRange(newPos, newPos);
  }

  moveToLineStart() {
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value;
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    this.textarea.setSelectionRange(lineStart, lineStart);
  }

  moveToLineEnd() {
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value;
    let lineEnd = text.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = text.length;
    this.textarea.setSelectionRange(lineEnd, lineEnd);
  }

  moveToFileStart() {
    this.textarea.setSelectionRange(0, 0);
  }

  moveToFileEnd() {
    const len = this.textarea.value.length;
    this.textarea.setSelectionRange(len, len);
  }

  deleteLine() {
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value;
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = text.indexOf('\n', pos);
    if (lineEnd === -1) {
      lineEnd = text.length;
    } else {
      lineEnd++; // Include newline
    }
    
    // Store in register
    this.vimRegisters.default = text.substring(lineStart, lineEnd);
    
    // Delete line
    this.textarea.value = text.substring(0, lineStart) + text.substring(lineEnd);
    this.textarea.setSelectionRange(lineStart, lineStart);
    this.handleInput();
  }

  yankLine() {
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value;
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = text.indexOf('\n', pos);
    if (lineEnd === -1) {
      lineEnd = text.length;
    } else {
      lineEnd++; // Include newline
    }
    
    // Store in register
    this.vimRegisters.default = text.substring(lineStart, lineEnd);
  }

  yankSelection() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    this.vimRegisters.default = this.textarea.value.substring(start, end);
  }

  deleteSelection() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const text = this.textarea.value;
    
    // Store in register
    this.vimRegisters.default = text.substring(start, end);
    
    // Delete selection
    this.textarea.value = text.substring(0, start) + text.substring(end);
    this.textarea.setSelectionRange(start, start);
    this.handleInput();
  }

  pasteAfter() {
    if (this.vimRegisters.default) {
      const pos = this.textarea.selectionStart;
      const text = this.textarea.value;
      const content = this.vimRegisters.default;
      
      if (content.endsWith('\n')) {
        // Line paste - paste on next line
        let lineEnd = text.indexOf('\n', pos);
        if (lineEnd === -1) {
          lineEnd = text.length;
          this.textarea.value = text + '\n' + content.trimEnd();
        } else {
          this.textarea.value = text.substring(0, lineEnd + 1) + content + text.substring(lineEnd + 1);
        }
        this.textarea.setSelectionRange(lineEnd + 1, lineEnd + 1);
      } else {
        // Character paste - paste after cursor
        this.textarea.value = text.substring(0, pos + 1) + content + text.substring(pos + 1);
        this.textarea.setSelectionRange(pos + content.length, pos + content.length);
      }
      
      this.handleInput();
    }
  }

  pasteBefore() {
    if (this.vimRegisters.default) {
      const pos = this.textarea.selectionStart;
      const text = this.textarea.value;
      const content = this.vimRegisters.default;
      
      if (content.endsWith('\n')) {
        // Line paste - paste on current line
        const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
        this.textarea.value = text.substring(0, lineStart) + content + text.substring(lineStart);
        this.textarea.setSelectionRange(lineStart, lineStart);
      } else {
        // Character paste - paste before cursor
        this.textarea.value = text.substring(0, pos) + content + text.substring(pos);
        this.textarea.setSelectionRange(pos + content.length - 1, pos + content.length - 1);
      }
      
      this.handleInput();
    }
  }
}

// Add editor styles
const style = document.createElement('style');
style.textContent = `
  .editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
  }
  
  .editor-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
  
  .highlight-layer {
    position: absolute;
    top: 0;
    left: 0;
    padding: 0 10px;
    pointer-events: none;
    overflow: hidden;
    white-space: pre;
    color: transparent;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 13px;
    line-height: 20px;
  }
  
  .highlight-content {
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
  
  /* Markdown syntax highlighting */
  .md-header {
    color: #0969da !important;
    font-weight: bold;
  }
  
  .md-h1 { font-size: 1.4em; }
  .md-h2 { font-size: 1.3em; }
  .md-h3 { font-size: 1.2em; }
  .md-h4 { font-size: 1.1em; }
  .md-h5 { font-size: 1.05em; }
  .md-h6 { font-size: 1em; }
  
  .md-bold {
    color: #24292e !important;
    font-weight: bold;
  }
  
  .md-italic {
    color: #24292e !important;
    font-style: italic;
  }
  
  .md-code {
    color: #032f62 !important;
    background: rgba(175, 184, 193, 0.2);
    padding: 0.1em 0.2em;
    border-radius: 3px;
  }
  
  .md-code-block,
  .md-fence {
    color: #032f62 !important;
    background: rgba(175, 184, 193, 0.1);
  }
  
  .md-link {
    color: #0969da !important;
    text-decoration: underline;
  }
  
  .md-image {
    color: #cf222e !important;
  }
  
  .md-list {
    color: #cf222e !important;
    font-weight: bold;
  }
  
  .md-blockquote {
    color: #57606a !important;
    border-left: 3px solid #d0d7de;
    padding-left: 0.5em;
  }
  
  .md-hr {
    color: #d0d7de !important;
  }
  
  .md-task {
    color: #0969da !important;
  }
  
  .find-bar {
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    padding: 8px;
  }
  
  .find-controls,
  .replace-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 600px;
  }
  
  .replace-controls {
    margin-top: 8px;
  }
  
  .find-input,
  .replace-input {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 13px;
  }
  
  .find-input:focus,
  .replace-input:focus {
    outline: none;
    border-color: #2196f3;
  }
  
  .find-results {
    font-size: 12px;
    color: #666;
    min-width: 50px;
    text-align: center;
  }
  
  .regex-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 12px;
    color: #666;
  }
  
  .regex-toggle input[type="checkbox"] {
    cursor: pointer;
  }
  
  .regex-toggle span {
    font-family: monospace;
    font-weight: bold;
  }
  
  .find-prev,
  .find-next,
  .find-close,
  .replace-toggle,
  .replace-current,
  .replace-all {
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 12px;
  }
  
  .find-prev:hover,
  .find-next:hover,
  .find-close:hover,
  .replace-toggle:hover,
  .replace-current:hover,
  .replace-all:hover {
    background: #f0f0f0;
  }
  
  .editor-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 13px;
    line-height: 20px;
  }
  
  .line-numbers {
    width: 50px;
    background: #f5f5f5;
    color: #999;
    text-align: right;
    padding-right: 10px;
    overflow-y: hidden;
    user-select: none;
    border-right: 1px solid #e0e0e0;
  }
  
  .line-number {
    height: 20px;
  }
  
  .editor-textarea {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 0 10px;
    border: none;
    resize: none;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    outline: none;
    background: transparent;
    z-index: 1;
  }
  
  .status-bar {
    height: 24px;
    background: #f5f5f5;
    border-top: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    font-size: 12px;
    color: #666;
  }
  
  .save-status {
    margin-left: auto;
  }
  
  .vim-toggle {
    margin-left: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  
  .vim-toggle input[type="checkbox"] {
    cursor: pointer;
  }
  
  .vim-mode-indicator {
    margin-left: 10px;
    font-weight: bold;
    color: #0969da;
  }
`;
document.head.appendChild(style);

// Export for use
window.MarkdownEditor = MarkdownEditor;