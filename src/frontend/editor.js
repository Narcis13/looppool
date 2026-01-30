/**
 * Markdown Editor Module
 * 
 * A lightweight markdown editor with auto-save functionality.
 * Follows the zero-dependency philosophy - uses browser native APIs.
 */

export class MarkdownEditor {
    constructor(container) {
        this.container = container;
        this.currentFile = null;
        this.content = '';
        this.originalContent = '';
        this.isDirty = false;
        this.isLoading = false;
        this.isSaving = false;
        
        // Auto-save configuration
        this.autoSaveTimer = null;
        this.autoSaveDelay = 2000; // 2 seconds as per spec
        
        // Editor elements
        this.wrapper = null;
        this.lineNumbers = null;
        this.textarea = null;
        this.highlightLayer = null;
        
        // Initialize the editor
        this.init();
    }
    
    init() {
        // Create editor structure
        this.createEditorElements();
        this.setupEventListeners();
        this.updateLineNumbers();
    }
    
    createEditorElements() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'editor-wrapper';
        
        // Create line numbers
        this.lineNumbers = document.createElement('div');
        this.lineNumbers.className = 'line-numbers';
        this.lineNumbers.setAttribute('aria-hidden', 'true');
        
        // Create textarea
        this.textarea = document.createElement('textarea');
        this.textarea.className = 'editor-textarea';
        this.textarea.setAttribute('spellcheck', 'false');
        this.textarea.setAttribute('autocomplete', 'off');
        this.textarea.setAttribute('autocorrect', 'off');
        this.textarea.setAttribute('autocapitalize', 'off');
        this.textarea.setAttribute('aria-label', 'Editor');
        
        // Create syntax highlight overlay (future enhancement)
        this.highlightLayer = document.createElement('div');
        this.highlightLayer.className = 'editor-highlight';
        this.highlightLayer.setAttribute('aria-hidden', 'true');
        
        // Assemble editor
        this.wrapper.appendChild(this.lineNumbers);
        this.wrapper.appendChild(this.textarea);
        this.wrapper.appendChild(this.highlightLayer);
        this.container.appendChild(this.wrapper);
    }
    
    setupEventListeners() {
        // Text input
        this.textarea.addEventListener('input', () => {
            this.handleInput();
        });
        
        // Keyboard shortcuts
        this.textarea.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        // Scroll sync
        this.textarea.addEventListener('scroll', () => {
            this.syncScroll();
        });
        
        // Tab handling
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.insertTab();
            }
        });
        
        // Save on blur (safety)
        this.textarea.addEventListener('blur', () => {
            if (this.isDirty && !this.isSaving) {
                this.save();
            }
        });
    }
    
    handleInput() {
        const newContent = this.textarea.value;
        
        // Check if content changed
        if (newContent !== this.content) {
            this.content = newContent;
            this.isDirty = this.content !== this.originalContent;
            
            // Update UI
            this.updateLineNumbers();
            this.updateSaveStatus();
            
            // Schedule auto-save
            this.scheduleAutoSave();
        }
    }
    
    handleKeyDown(e) {
        // Cmd/Ctrl+S to save
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            this.save();
        }
        
        // Basic undo/redo (browser handles this natively)
        // Additional shortcuts can be added here
    }
    
    insertTab() {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        
        // Insert 2 spaces (following common markdown convention)
        const spaces = '  ';
        
        this.textarea.value = 
            this.content.substring(0, start) + 
            spaces + 
            this.content.substring(end);
        
        // Move cursor
        this.textarea.selectionStart = this.textarea.selectionEnd = start + spaces.length;
        
        // Trigger input event
        this.handleInput();
    }
    
    syncScroll() {
        this.lineNumbers.scrollTop = this.textarea.scrollTop;
        this.highlightLayer.scrollTop = this.textarea.scrollTop;
    }
    
    updateLineNumbers() {
        const lines = this.content.split('\n');
        const lineCount = lines.length;
        
        // Only update if line count changed
        const currentLineCount = this.lineNumbers.children.length;
        if (currentLineCount === lineCount) {
            return;
        }
        
        // Clear and rebuild line numbers
        this.lineNumbers.innerHTML = '';
        
        for (let i = 1; i <= lineCount; i++) {
            const lineNumber = document.createElement('div');
            lineNumber.className = 'line-number';
            lineNumber.textContent = i;
            this.lineNumbers.appendChild(lineNumber);
        }
    }
    
    scheduleAutoSave() {
        // Cancel existing timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // Don't schedule if not dirty or already saving
        if (!this.isDirty || this.isSaving) {
            return;
        }
        
        // Schedule new save
        this.autoSaveTimer = setTimeout(() => {
            this.save();
        }, this.autoSaveDelay);
    }
    
    updateSaveStatus() {
        const saveStatus = document.getElementById('save-status');
        const saveText = saveStatus.querySelector('.save-text');
        
        if (this.isSaving) {
            saveText.textContent = 'Saving...';
            saveStatus.className = 'save-indicator saving';
        } else if (this.isDirty) {
            saveText.textContent = 'Unsaved';
            saveStatus.className = 'save-indicator unsaved';
        } else {
            saveText.textContent = 'Saved';
            saveStatus.className = 'save-indicator saved';
        }
    }
    
    async loadFile(path) {
        if (this.isLoading) {
            return;
        }
        
        // Save current file if dirty
        if (this.isDirty && this.currentFile) {
            await this.save();
        }
        
        this.isLoading = true;
        this.currentFile = path;
        
        try {
            const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.status}`);
            }
            
            const data = await response.json();
            this.content = data.content;
            this.originalContent = data.content;
            this.isDirty = false;
            
            // Update UI
            this.textarea.value = this.content;
            this.updateLineNumbers();
            this.updateSaveStatus();
            
            // Focus editor
            this.textarea.focus();
            
            // Clear any pending auto-save
            if (this.autoSaveTimer) {
                clearTimeout(this.autoSaveTimer);
                this.autoSaveTimer = null;
            }
        } catch (error) {
            console.error('Failed to load file:', error);
            this.showError(`Failed to load file: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }
    
    async save() {
        if (!this.currentFile || !this.isDirty || this.isSaving) {
            return;
        }
        
        // Clear auto-save timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        this.isSaving = true;
        this.updateSaveStatus();
        
        try {
            const response = await fetch(`/api/file?path=${encodeURIComponent(this.currentFile)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: this.content })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save: ${response.status}`);
            }
            
            this.originalContent = this.content;
            this.isDirty = false;
            
            // Update save status
            this.updateSaveStatus();
        } catch (error) {
            console.error('Failed to save file:', error);
            this.showError(`Failed to save: ${error.message}`);
            
            // Retry save after delay
            setTimeout(() => {
                this.scheduleAutoSave();
            }, 5000);
        } finally {
            this.isSaving = false;
        }
    }
    
    showError(message) {
        // Simple error display - could be enhanced with toast notifications
        const errorDiv = document.createElement('div');
        errorDiv.className = 'editor-error';
        errorDiv.textContent = message;
        this.container.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    // Check if there are unsaved changes
    hasUnsavedChanges() {
        return this.isDirty;
    }
    
    // Get current content
    getContent() {
        return this.content;
    }
    
    // Set content programmatically
    setContent(content) {
        this.content = content;
        this.textarea.value = content;
        this.updateLineNumbers();
        this.handleInput();
    }
    
    // Focus the editor
    focus() {
        this.textarea.focus();
    }
    
    // Get cursor position
    getCursorPosition() {
        return {
            start: this.textarea.selectionStart,
            end: this.textarea.selectionEnd
        };
    }
    
    // Set cursor position
    setCursorPosition(start, end = start) {
        this.textarea.selectionStart = start;
        this.textarea.selectionEnd = end;
    }
    
    // Insert text at cursor
    insertAtCursor(text) {
        const pos = this.getCursorPosition();
        const before = this.content.substring(0, pos.start);
        const after = this.content.substring(pos.end);
        
        this.setContent(before + text + after);
        this.setCursorPosition(pos.start + text.length);
    }
    
    // Cleanup
    destroy() {
        // Save if dirty
        if (this.isDirty) {
            this.save();
        }
        
        // Clear timers
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // Remove elements
        this.container.innerHTML = '';
        
        // Clear references
        this.wrapper = null;
        this.lineNumbers = null;
        this.textarea = null;
        this.highlightLayer = null;
    }
}

// Export for use in app.js
export default MarkdownEditor;