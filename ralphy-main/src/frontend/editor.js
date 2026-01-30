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
    this.setupEditor();
    this.setupKeyboardShortcuts();
  }

  setupEditor() {
    // Create editor structure
    this.container.innerHTML = `
      <div class="editor-container">
        <div class="find-bar" id="find-bar" style="display: none;">
          <div class="find-controls">
            <input type="text" id="find-input" placeholder="Find..." class="find-input">
            <span class="find-results">0/0</span>
            <button class="find-prev" title="Previous match (Shift+Enter)">↑</button>
            <button class="find-next" title="Next match (Enter)">↓</button>
            <button class="find-close" title="Close (Esc)">×</button>
          </div>
        </div>
        <div class="editor-content">
          <div class="line-numbers"></div>
          <textarea class="editor-textarea" wrap="off" spellcheck="false"></textarea>
        </div>
        <div class="status-bar">
          <span class="file-path"></span>
          <span class="save-status">Ready</span>
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

    // Set up event listeners
    this.textarea.addEventListener('input', () => this.handleInput());
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    
    // Find functionality event listeners
    this.findInput.addEventListener('input', () => this.performFind());
    this.findInput.addEventListener('keydown', (e) => this.handleFindKeydown(e));
    
    this.container.querySelector('.find-next').addEventListener('click', () => this.findNext());
    this.container.querySelector('.find-prev').addEventListener('click', () => this.findPrevious());
    this.container.querySelector('.find-close').addEventListener('click', () => this.closeFindBar());

    // Initial line numbers
    this.updateLineNumbers();
  }

  setupKeyboardShortcuts() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl+F - Open find
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        this.openFindBar();
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

  openFindBar() {
    this.findBar.style.display = 'block';
    this.findInput.focus();
    this.findInput.select();
    this.performFind();
  }

  closeFindBar() {
    this.findBar.style.display = 'none';
    this.clearFindHighlights();
    this.textarea.focus();
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
    
    // Find all matches
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

  handleInput() {
    this.isDirty = true;
    this.updateLineNumbers();
    this.updateStatus('Unsaved');
    
    // Debounced auto-save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.save(), this.saveDebounceTime);
  }

  syncScroll() {
    this.lineNumbers.scrollTop = this.textarea.scrollTop;
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

  loadFile(path, content) {
    this.currentFile = path;
    this.currentContent = content;
    this.textarea.value = content;
    this.isDirty = false;
    this.updateLineNumbers();
    this.updateStatus('Saved');
    this.container.querySelector('.file-path').textContent = path;
  }

  async save() {
    if (!this.currentFile || !this.isDirty) return;
    
    this.updateStatus('Saving...');
    
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
  
  .find-bar {
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    padding: 8px;
  }
  
  .find-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 400px;
  }
  
  .find-input {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 13px;
  }
  
  .find-input:focus {
    outline: none;
    border-color: #2196f3;
  }
  
  .find-results {
    font-size: 12px;
    color: #666;
    min-width: 50px;
    text-align: center;
  }
  
  .find-prev,
  .find-next,
  .find-close {
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 12px;
  }
  
  .find-prev:hover,
  .find-next:hover,
  .find-close:hover {
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
    flex: 1;
    padding: 0 10px;
    border: none;
    resize: none;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    outline: none;
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
`;
document.head.appendChild(style);

// Export for use
window.MarkdownEditor = MarkdownEditor;