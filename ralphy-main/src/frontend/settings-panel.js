class SettingsPanel {
  constructor(container) {
    this.container = container;
    this.settings = this.loadSettings();
    this.setupPanel();
    this.bindEventListeners();
  }
  
  loadSettings() {
    const defaults = {
      editor: {
        fontSize: 13,
        lineHeight: 20,
        tabSize: 2,
        wordWrap: false,
        theme: 'light',
        autoSave: true,
        autoSaveDelay: 2000,
        showLineNumbers: true,
        highlightCurrentLine: true,
        bracketMatching: true
      },
      appearance: {
        sidebarWidth: 250,
        statePanelWidth: 300,
        fontFamily: "'SF Mono', Monaco, 'Courier New', monospace"
      },
      behavior: {
        confirmOnClose: true,
        autoRefreshFileTree: true,
        rememberOpenFiles: true,
        doubleClickToOpen: false
      }
    };
    
    const saved = localStorage.getItem('lpl-ide-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Deep merge with defaults
        return this.deepMerge(defaults, parsed);
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    
    return defaults;
  }
  
  deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }
  
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
  
  saveSettings() {
    localStorage.setItem('lpl-ide-settings', JSON.stringify(this.settings));
    // Emit settings changed event
    document.dispatchEvent(new CustomEvent('settings-changed', { detail: this.settings }));
  }
  
  setupPanel() {
    this.container.innerHTML = `
      <div class="settings-panel" role="region" aria-label="Settings panel">
        <div class="settings-header">
          <h2 id="settings-heading">Settings</h2>
          <button class="settings-close-btn" title="Close settings" aria-label="Close settings panel">×</button>
        </div>
        <div class="settings-content" role="form" aria-labelledby="settings-heading">
          <div class="settings-section">
            <h3>Editor</h3>
            
            <div class="setting-group">
              <label for="font-size">Font Size</label>
              <div class="setting-control">
                <input type="range" id="font-size" min="10" max="20" value="${this.settings.editor.fontSize}" aria-label="Font size" aria-valuemin="10" aria-valuemax="20" aria-valuenow="${this.settings.editor.fontSize}">
                <span class="setting-value" aria-live="polite">${this.settings.editor.fontSize}px</span>
              </div>
            </div>
            
            <div class="setting-group">
              <label for="line-height">Line Height</label>
              <div class="setting-control">
                <input type="range" id="line-height" min="16" max="30" value="${this.settings.editor.lineHeight}" aria-label="Line height" aria-valuemin="16" aria-valuemax="30" aria-valuenow="${this.settings.editor.lineHeight}">
                <span class="setting-value" aria-live="polite">${this.settings.editor.lineHeight}px</span>
              </div>
            </div>
            
            <div class="setting-group">
              <label for="tab-size">Tab Size</label>
              <div class="setting-control">
                <input type="range" id="tab-size" min="2" max="8" step="2" value="${this.settings.editor.tabSize}" aria-label="Tab size" aria-valuemin="2" aria-valuemax="8" aria-valuenow="${this.settings.editor.tabSize}">
                <span class="setting-value" aria-live="polite">${this.settings.editor.tabSize} spaces</span>
              </div>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="word-wrap" ${this.settings.editor.wordWrap ? 'checked' : ''} aria-label="Enable word wrap">
                Word Wrap
              </label>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="show-line-numbers" ${this.settings.editor.showLineNumbers ? 'checked' : ''} aria-label="Show line numbers">
                Show Line Numbers
              </label>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="highlight-current-line" ${this.settings.editor.highlightCurrentLine ? 'checked' : ''}>
                Highlight Current Line
              </label>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="bracket-matching" ${this.settings.editor.bracketMatching ? 'checked' : ''}>
                Bracket Matching
              </label>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="auto-save" ${this.settings.editor.autoSave ? 'checked' : ''} aria-label="Enable auto save">
                Auto Save
              </label>
            </div>
            
            <div class="setting-group ${!this.settings.editor.autoSave ? 'disabled' : ''}">
              <label for="auto-save-delay">Auto Save Delay</label>
              <div class="setting-control">
                <input type="range" id="auto-save-delay" min="500" max="5000" step="500" value="${this.settings.editor.autoSaveDelay}" ${!this.settings.editor.autoSave ? 'disabled' : ''} aria-label="Auto save delay in milliseconds" aria-valuemin="500" aria-valuemax="5000" aria-valuenow="${this.settings.editor.autoSaveDelay}">
                <span class="setting-value" aria-live="polite">${this.settings.editor.autoSaveDelay}ms</span>
              </div>
            </div>
            
            <div class="setting-group">
              <label for="theme">Theme</label>
              <select id="theme" class="setting-select" aria-label="Select theme">
                <option value="light" ${this.settings.editor.theme === 'light' ? 'selected' : ''}>Light</option>
                <option value="dark" ${this.settings.editor.theme === 'dark' ? 'selected' : ''}>Dark</option>
                <option value="auto" ${this.settings.editor.theme === 'auto' ? 'selected' : ''}>Auto (System)</option>
              </select>
            </div>
          </div>
          
          <div class="settings-section">
            <h3>Appearance</h3>
            
            <div class="setting-group">
              <label for="sidebar-width">Sidebar Width</label>
              <div class="setting-control">
                <input type="range" id="sidebar-width" min="200" max="400" step="10" value="${this.settings.appearance.sidebarWidth}">
                <span class="setting-value">${this.settings.appearance.sidebarWidth}px</span>
              </div>
            </div>
            
            <div class="setting-group">
              <label for="state-panel-width">State Panel Width</label>
              <div class="setting-control">
                <input type="range" id="state-panel-width" min="250" max="500" step="10" value="${this.settings.appearance.statePanelWidth}">
                <span class="setting-value">${this.settings.appearance.statePanelWidth}px</span>
              </div>
            </div>
            
            <div class="setting-group">
              <label for="font-family">Font Family</label>
              <select id="font-family" class="setting-select">
                <option value="'SF Mono', Monaco, 'Courier New', monospace">SF Mono (Default)</option>
                <option value="'Fira Code', monospace">Fira Code</option>
                <option value="'Source Code Pro', monospace">Source Code Pro</option>
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                <option value="'Consolas', monospace">Consolas</option>
                <option value="monospace">System Monospace</option>
              </select>
            </div>
          </div>
          
          <div class="settings-section">
            <h3>Behavior</h3>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="confirm-on-close" ${this.settings.behavior.confirmOnClose ? 'checked' : ''}>
                Confirm on Close (with unsaved changes)
              </label>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="auto-refresh-file-tree" ${this.settings.behavior.autoRefreshFileTree ? 'checked' : ''}>
                Auto Refresh File Tree
              </label>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="remember-open-files" ${this.settings.behavior.rememberOpenFiles ? 'checked' : ''}>
                Remember Open Files
              </label>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="double-click-to-open" ${this.settings.behavior.doubleClickToOpen ? 'checked' : ''}>
                Double Click to Open Files (instead of single click)
              </label>
            </div>
          </div>
          
          <div class="settings-footer">
            <button class="settings-reset-btn" aria-label="Reset all settings to default values">Reset to Defaults</button>
            <div class="settings-actions">
              <button class="settings-export-btn" aria-label="Export settings to JSON file">Export Settings</button>
              <button class="settings-import-btn" aria-label="Import settings from JSON file">Import Settings</button>
              <input type="file" id="settings-import-input" accept=".json" style="display: none;" aria-label="Select settings file to import">
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  bindEventListeners() {
    // Range inputs
    const rangeInputs = this.container.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleRangeChange(e));
      input.addEventListener('change', (e) => this.handleRangeChange(e));
    });
    
    // Checkboxes
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => this.handleCheckboxChange(e));
    });
    
    // Select inputs
    const selects = this.container.querySelectorAll('select');
    selects.forEach(select => {
      select.addEventListener('change', (e) => this.handleSelectChange(e));
    });
    
    // Close button
    this.container.querySelector('.settings-close-btn').addEventListener('click', () => {
      this.close();
    });
    
    // Reset button
    this.container.querySelector('.settings-reset-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all settings to defaults?')) {
        this.resetToDefaults();
      }
    });
    
    // Export button
    this.container.querySelector('.settings-export-btn').addEventListener('click', () => {
      this.exportSettings();
    });
    
    // Import button
    this.container.querySelector('.settings-import-btn').addEventListener('click', () => {
      document.getElementById('settings-import-input').click();
    });
    
    // Import file input
    document.getElementById('settings-import-input').addEventListener('change', (e) => {
      this.importSettings(e);
    });
    
    // Auto save toggle affects delay control
    const autoSaveCheckbox = this.container.querySelector('#auto-save');
    autoSaveCheckbox.addEventListener('change', () => {
      const delayGroup = this.container.querySelector('#auto-save-delay').parentElement.parentElement;
      const delayInput = this.container.querySelector('#auto-save-delay');
      if (autoSaveCheckbox.checked) {
        delayGroup.classList.remove('disabled');
        delayInput.disabled = false;
      } else {
        delayGroup.classList.add('disabled');
        delayInput.disabled = true;
      }
    });
  }
  
  handleRangeChange(e) {
    const value = e.target.value;
    const span = e.target.nextElementSibling;
    
    // Update display
    switch (e.target.id) {
      case 'font-size':
        span.textContent = `${value}px`;
        this.settings.editor.fontSize = parseInt(value);
        break;
      case 'line-height':
        span.textContent = `${value}px`;
        this.settings.editor.lineHeight = parseInt(value);
        break;
      case 'tab-size':
        span.textContent = `${value} spaces`;
        this.settings.editor.tabSize = parseInt(value);
        break;
      case 'auto-save-delay':
        span.textContent = `${value}ms`;
        this.settings.editor.autoSaveDelay = parseInt(value);
        break;
      case 'sidebar-width':
        span.textContent = `${value}px`;
        this.settings.appearance.sidebarWidth = parseInt(value);
        break;
      case 'state-panel-width':
        span.textContent = `${value}px`;
        this.settings.appearance.statePanelWidth = parseInt(value);
        break;
    }
    
    this.saveSettings();
  }
  
  handleCheckboxChange(e) {
    const checked = e.target.checked;
    
    switch (e.target.id) {
      case 'word-wrap':
        this.settings.editor.wordWrap = checked;
        break;
      case 'show-line-numbers':
        this.settings.editor.showLineNumbers = checked;
        break;
      case 'highlight-current-line':
        this.settings.editor.highlightCurrentLine = checked;
        break;
      case 'bracket-matching':
        this.settings.editor.bracketMatching = checked;
        break;
      case 'auto-save':
        this.settings.editor.autoSave = checked;
        break;
      case 'confirm-on-close':
        this.settings.behavior.confirmOnClose = checked;
        break;
      case 'auto-refresh-file-tree':
        this.settings.behavior.autoRefreshFileTree = checked;
        break;
      case 'remember-open-files':
        this.settings.behavior.rememberOpenFiles = checked;
        break;
      case 'double-click-to-open':
        this.settings.behavior.doubleClickToOpen = checked;
        break;
    }
    
    this.saveSettings();
  }
  
  handleSelectChange(e) {
    const value = e.target.value;
    
    switch (e.target.id) {
      case 'theme':
        this.settings.editor.theme = value;
        break;
      case 'font-family':
        this.settings.appearance.fontFamily = value;
        break;
    }
    
    this.saveSettings();
  }
  
  resetToDefaults() {
    // Clear saved settings
    localStorage.removeItem('lpl-ide-settings');
    // Reload defaults
    this.settings = this.loadSettings();
    // Rebuild UI
    this.setupPanel();
    this.bindEventListeners();
    // Save and notify
    this.saveSettings();
  }
  
  exportSettings() {
    const dataStr = JSON.stringify(this.settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lpl-ide-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  
  importSettings(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        this.settings = this.deepMerge(this.settings, imported);
        this.saveSettings();
        // Rebuild UI
        this.setupPanel();
        this.bindEventListeners();
        alert('Settings imported successfully!');
      } catch (error) {
        alert('Failed to import settings: Invalid JSON file');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  }
  
  open() {
    this.container.style.display = 'block';
  }
  
  close() {
    this.container.style.display = 'none';
  }
}

// Add settings panel styles
const style = document.createElement('style');
style.textContent = `
  .settings-panel {
    height: 100%;
    background: white;
    display: flex;
    flex-direction: column;
  }
  
  .settings-header {
    padding: 15px 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .settings-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }
  
  .settings-close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .settings-close-btn:hover {
    background: #f0f0f0;
  }
  
  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .settings-section {
    margin-bottom: 30px;
  }
  
  .settings-section h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    font-weight: 500;
    color: #333;
  }
  
  .setting-group {
    margin-bottom: 15px;
  }
  
  .setting-group.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  
  .setting-group label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: #555;
    cursor: pointer;
  }
  
  .setting-group input[type="checkbox"] {
    margin-right: 8px;
    cursor: pointer;
  }
  
  .setting-control {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .setting-control input[type="range"] {
    flex: 1;
    cursor: pointer;
  }
  
  .setting-value {
    min-width: 60px;
    font-size: 13px;
    color: #666;
    text-align: right;
  }
  
  .setting-select {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  }
  
  .setting-select:focus {
    outline: none;
    border-color: #2196f3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
  }
  
  .settings-footer {
    padding: 20px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .settings-reset-btn {
    padding: 8px 16px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .settings-reset-btn:hover {
    background: #d32f2f;
  }
  
  .settings-actions {
    display: flex;
    gap: 10px;
  }
  
  .settings-export-btn,
  .settings-import-btn {
    padding: 8px 16px;
    background: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .settings-export-btn:hover,
  .settings-import-btn:hover {
    background: #1976d2;
  }
  
  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .settings-panel {
      background: #1e1e1e;
      color: #d4d4d4;
    }
    
    .settings-header,
    .settings-footer {
      border-color: #333;
    }
    
    .settings-section h3 {
      color: #d4d4d4;
    }
    
    .setting-group label {
      color: #cccccc;
    }
    
    .setting-value {
      color: #999;
    }
    
    .setting-select {
      background: #2d2d2d;
      border-color: #444;
      color: #d4d4d4;
    }
    
    .settings-close-btn {
      color: #cccccc;
    }
    
    .settings-close-btn:hover {
      background: #333;
    }
  }
`;
document.head.appendChild(style);

// Export for use
window.SettingsPanel = SettingsPanel;