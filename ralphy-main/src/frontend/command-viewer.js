class CommandViewer {
  constructor(container) {
    this.container = container;
    this.currentFile = null;
    this.toolDescriptions = {
      Read: 'Read file contents',
      Write: 'Write content to a file',
      Edit: 'Edit existing file content',
      MultiEdit: 'Make multiple edits to a file',
      Bash: 'Execute bash commands',
      Glob: 'Find files by pattern',
      Grep: 'Search content in files',
      LS: 'List directory contents',
      Task: 'Launch autonomous agents',
      WebFetch: 'Fetch and analyze web content',
      WebSearch: 'Search the web',
      NotebookRead: 'Read Jupyter notebook',
      NotebookEdit: 'Edit Jupyter notebook',
      TodoRead: 'Read todo list',
      TodoWrite: 'Update todo list',
      AskUserQuestion: 'Ask the user a question',
      exit_plan_mode: 'Exit planning mode'
    };
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="command-viewer" role="tablist" aria-label="Command viewer tabs">
        <div class="command-tabs" role="tablist">
          <button class="command-tab active" data-tab="metadata" role="tab" aria-selected="true" aria-controls="metadata-panel" id="metadata-tab">Metadata</button>
          <button class="command-tab" data-tab="raw" role="tab" aria-selected="false" aria-controls="raw-panel" id="raw-tab">Raw Content</button>
        </div>
        <div class="command-content">
          <div class="command-panel metadata-panel active" data-panel="metadata" role="tabpanel" aria-labelledby="metadata-tab" id="metadata-panel">
            <div class="metadata-card">
              <div class="metadata-loading" role="status" aria-live="polite">Select a command file to view metadata</div>
            </div>
          </div>
          <div class="command-panel raw-panel" data-panel="raw" role="tabpanel" aria-labelledby="raw-tab" id="raw-panel">
            <pre class="raw-content" aria-label="Raw file content"></pre>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
    this.attachEventListeners();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .command-viewer {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .command-tabs {
        display: flex;
        background: #f0f0f0;
        border-bottom: 1px solid #ddd;
      }
      .command-tab {
        padding: 8px 16px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
        color: #666;
      }
      .command-tab.active {
        background: white;
        color: #333;
        font-weight: 500;
      }
      .command-content {
        flex: 1;
        overflow: hidden;
      }
      .command-panel {
        height: 100%;
        overflow-y: auto;
        display: none;
      }
      .command-panel.active {
        display: block;
      }
      .metadata-card {
        padding: 20px;
      }
      .metadata-loading {
        color: #666;
        font-style: italic;
      }
      .metadata-header {
        margin-bottom: 20px;
      }
      .command-name {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .command-description {
        color: #666;
        font-size: 16px;
      }
      .metadata-field {
        margin-bottom: 16px;
      }
      .metadata-label {
        font-weight: 500;
        color: #333;
        margin-bottom: 4px;
      }
      .metadata-value {
        color: #666;
      }
      .argument-hint {
        font-family: monospace;
        background: #f5f5f5;
        padding: 4px 8px;
        border-radius: 4px;
        display: inline-block;
      }
      .tools-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .tool-badge {
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
        color: white;
        cursor: help;
        position: relative;
      }
      .tool-badge:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-4px);
        background: #333;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        pointer-events: none;
      }
      .tool-badge:hover::before {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-top-color: #333;
        z-index: 1000;
        pointer-events: none;
      }
      .tool-badge.read { background: #4caf50; }
      .tool-badge.write { background: #ff9800; }
      .tool-badge.edit { background: #2196f3; }
      .tool-badge.multiedit { background: #9c27b0; }
      .tool-badge.bash { background: #795548; }
      .tool-badge.glob { background: #607d8b; }
      .tool-badge.grep { background: #009688; }
      .tool-badge.ls { background: #3f51b5; }
      .tool-badge.task { background: #e91e63; }
      .tool-badge.webfetch { background: #00bcd4; }
      .tool-badge.websearch { background: #ffeb3b; color: #333; }
      .tool-badge.notebookread { background: #ff5722; }
      .tool-badge.notebookedit { background: #f44336; }
      .tool-badge.todoread { background: #cddc39; color: #333; }
      .tool-badge.todowrite { background: #8bc34a; }
      .tool-badge.askuserquestion { background: #ffc107; color: #333; }
      .tool-badge.exit_plan_mode { background: #9e9e9e; }
      .action-buttons {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }
      .action-button {
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
      }
      .action-button:hover {
        background: #f5f5f5;
      }
      .action-button.view-workflow {
        background: #2196f3;
        color: white;
        border-color: #2196f3;
      }
      .action-button.view-workflow:hover {
        background: #1976d2;
      }
      .raw-content {
        padding: 20px;
        margin: 0;
        font-family: monospace;
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .error-message {
        color: #f44336;
        padding: 20px;
        text-align: center;
      }
      .file-link {
        color: #2196f3;
        text-decoration: none;
        font-family: monospace;
        font-size: 14px;
        padding: 2px 4px;
        background: #f5f5f5;
        border-radius: 3px;
        margin-right: 8px;
      }
      .file-link:hover {
        background: #e3f2fd;
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    // Tab switching
    this.container.querySelectorAll('.command-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    this.container.querySelectorAll('.command-tab').forEach(tab => {
      const isActive = tab.dataset.tab === tabName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update panels
    this.container.querySelectorAll('.command-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === tabName);
    });
  }

  parseFrontmatter(content) {
    const lines = content.split('\n');
    if (lines[0] !== '---') {
      return { frontmatter: null, content };
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return { frontmatter: null, content };
    }

    const frontmatterLines = lines.slice(1, endIndex);
    const remainingContent = lines.slice(endIndex + 1).join('\n');
    
    const frontmatter = {};
    let currentKey = null;
    let currentValue = '';
    let isMultilineArray = false;

    for (const line of frontmatterLines) {
      // Check for multiline array continuation
      if (isMultilineArray) {
        if (line.match(/^\s*-\s+/)) {
          const value = line.replace(/^\s*-\s+/, '').trim();
          frontmatter[currentKey].push(this.parseValue(value));
        } else if (line.trim() && !line.match(/^\s/)) {
          // New key, end multiline array
          isMultilineArray = false;
        } else {
          continue;
        }
      }

      // Parse key-value pairs
      const keyMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (keyMatch) {
        currentKey = keyMatch[1];
        const valueStr = keyMatch[2].trim();

        // Check for inline array
        if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
          frontmatter[currentKey] = valueStr
            .slice(1, -1)
            .split(',')
            .map(v => this.parseValue(v.trim()));
        } else if (valueStr === '') {
          // Check next lines for multiline array
          isMultilineArray = true;
          frontmatter[currentKey] = [];
        } else {
          frontmatter[currentKey] = this.parseValue(valueStr);
        }
      }
    }

    return { frontmatter, content: remainingContent };
  }

  parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }
    return value;
  }

  parseFileReferences(content) {
    const references = {
      workflows: [],
      agents: [],
      templates: []
    };

    // Regular expressions to match file references
    const patterns = {
      // Match workflow references: looppool/workflows/*.md
      workflows: /looppool\/workflows\/[\w-]+\.md/g,
      // Match agent references: agents/*.md
      agents: /agents\/[\w-]+\.md/g,
      // Match template references: looppool/templates/*.md
      templates: /looppool\/templates\/[\w-]+\.md/g
    };

    // Also match more general markdown file links [text](path.md)
    const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
    const codeBlockPattern = /```[\s\S]*?```/g;
    const inlineCodePattern = /`[^`]+`/g;

    // Remove code blocks and inline code to avoid false positives
    const cleanContent = content
      .replace(codeBlockPattern, '')
      .replace(inlineCodePattern, '');

    // Extract workflow references
    let match;
    while ((match = patterns.workflows.exec(cleanContent)) !== null) {
      if (!references.workflows.includes(match[0])) {
        references.workflows.push(match[0]);
      }
    }

    // Extract agent references
    while ((match = patterns.agents.exec(cleanContent)) !== null) {
      if (!references.agents.includes(match[0])) {
        references.agents.push(match[0]);
      }
    }

    // Extract template references
    while ((match = patterns.templates.exec(cleanContent)) !== null) {
      if (!references.templates.includes(match[0])) {
        references.templates.push(match[0]);
      }
    }

    // Also check markdown links
    while ((match = markdownLinkPattern.exec(cleanContent)) !== null) {
      const linkPath = match[2];
      
      if (linkPath.includes('looppool/workflows/') && !references.workflows.includes(linkPath)) {
        references.workflows.push(linkPath);
      } else if (linkPath.includes('agents/') && !references.agents.includes(linkPath)) {
        references.agents.push(linkPath);
      } else if (linkPath.includes('looppool/templates/') && !references.templates.includes(linkPath)) {
        references.templates.push(linkPath);
      }
    }

    return references;
  }

  async loadCommand(filePath) {
    this.currentFile = filePath;
    
    // Track command view
    document.dispatchEvent(new CustomEvent('command-viewed'));
    
    // Show skeleton loader
    this.showCommandSkeleton();
    
    try {
      const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status}`);
      }

      const content = await response.text();
      const { frontmatter, content: bodyContent } = this.parseFrontmatter(content);

      // Update raw content panel
      this.container.querySelector('.raw-content').textContent = content;

      // Update metadata panel
      if (frontmatter) {
        this.renderMetadata(frontmatter, bodyContent);
      } else {
        this.container.querySelector('.metadata-card').innerHTML = 
          '<div class="error-message">No frontmatter found in this file</div>';
      }
    } catch (error) {
      console.error('Failed to load command:', error);
      this.container.querySelector('.metadata-card').innerHTML = 
        `<div class="error-message">Failed to load command: ${error.message}</div>`;
      this.container.querySelector('.raw-content').textContent = '';
    }
  }

  renderMetadata(frontmatter, bodyContent) {
    const metadataCard = this.container.querySelector('.metadata-card');
    
    let html = '<div class="metadata-header">';
    html += `<div class="command-name">${frontmatter.name || 'Unnamed Command'}</div>`;
    html += `<div class="command-description">${frontmatter.description || 'No description available'}</div>`;
    html += '</div>';

    if (frontmatter['argument-hint']) {
      html += '<div class="metadata-field">';
      html += '<div class="metadata-label">Arguments:</div>';
      html += `<div class="metadata-value"><span class="argument-hint">${frontmatter['argument-hint']}</span></div>`;
      html += '</div>';
    }

    if (frontmatter.agent) {
      html += '<div class="metadata-field">';
      html += '<div class="metadata-label">Agent:</div>';
      html += `<div class="metadata-value">${frontmatter.agent}</div>`;
      html += '</div>';
    }

    if (frontmatter['allowed-tools'] && Array.isArray(frontmatter['allowed-tools'])) {
      html += '<div class="metadata-field">';
      html += '<div class="metadata-label">Allowed Tools:</div>';
      html += '<div class="metadata-value tools-list">';
      frontmatter['allowed-tools'].forEach(tool => {
        const className = tool.toLowerCase().replace(/_/g, '');
        const tooltip = this.toolDescriptions[tool] || 'Tool for various operations';
        html += `<span class="tool-badge ${className}" data-tooltip="${tooltip}">${tool}</span>`;
      });
      html += '</div>';
      html += '</div>';
    }

    // Parse file references from body content
    const parsedReferences = this.parseFileReferences(bodyContent);
    
    // Render workflow references
    if (parsedReferences.workflows.length > 0) {
      html += '<div class="metadata-field">';
      html += '<div class="metadata-label">Delegated Workflow:</div>';
      html += '<div class="metadata-value">';
      parsedReferences.workflows.forEach(workflow => {
        html += `<a href="#" class="file-link" data-path="${workflow}">${workflow}</a>`;
      });
      html += '</div>';
      html += '</div>';
    }

    html += '<div class="action-buttons" role="group" aria-label="Command actions">';
    html += `<button class="action-button copy-command" aria-label="Copy command to clipboard">Copy as /lpl:command</button>`;
    html += `<button class="action-button test-terminal" aria-label="Copy test command for terminal">Test in terminal</button>`;
    
    // Add View workflow button if a workflow is referenced
    if (parsedReferences.workflows.length > 0) {
      html += `<button class="action-button view-workflow" data-workflow="${parsedReferences.workflows[0]}" aria-label="Open workflow file">View workflow →</button>`;
    }
    
    html += '</div>';

    // Render agent references
    if (parsedReferences.agents.length > 0) {
      html += '<div class="metadata-field">';
      html += '<div class="metadata-label">Spawned Agents:</div>';
      html += '<div class="metadata-value">';
      parsedReferences.agents.forEach(agent => {
        html += `<a href="#" class="file-link" data-path="${agent}">${agent}</a>`;
      });
      html += '</div>';
      html += '</div>';
    }

    // Render template references
    if (parsedReferences.templates.length > 0) {
      html += '<div class="metadata-field">';
      html += '<div class="metadata-label">Templates Used:</div>';
      html += '<div class="metadata-value">';
      parsedReferences.templates.forEach(template => {
        html += `<a href="#" class="file-link" data-path="${template}">${template}</a>`;
      });
      html += '</div>';
      html += '</div>';
    }

    metadataCard.innerHTML = html;

    // Attach action button listeners
    metadataCard.querySelector('.copy-command')?.addEventListener('click', async () => {
      await this.copyCommand(frontmatter.name);
    });

    metadataCard.querySelector('.test-terminal')?.addEventListener('click', () => {
      this.testInTerminal(frontmatter);
    });
    
    // Attach view workflow button listener
    metadataCard.querySelector('.view-workflow')?.addEventListener('click', (e) => {
      const workflowPath = e.target.dataset.workflow;
      if (workflowPath) {
        // Emit event for file tree to handle
        window.dispatchEvent(new CustomEvent('open-file', { detail: { path: workflowPath } }));
      }
    });

    // Attach file link listeners
    metadataCard.querySelectorAll('.file-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const filePath = e.target.dataset.path;
        // Emit event for file tree to handle
        window.dispatchEvent(new CustomEvent('open-file', { detail: { path: filePath } }));
      });
    });
  }

  async copyCommand(commandName) {
    const text = `/${commandName}`;
    this.copyToClipboard(text, '.copy-command', 'Copied!');
  }

  testInTerminal(frontmatter) {
    if (!frontmatter.name) {
      console.error('No command name found');
      return;
    }

    // Build the shell command with proper escaping
    let shellCommand = `looppool-cc ${this.escapeShellArg(frontmatter.name)}`;
    
    // Add argument hint if provided
    if (frontmatter['argument-hint']) {
      // Extract the hint text without brackets
      const hint = frontmatter['argument-hint']
        .replace(/^\[/, '') // Remove leading [
        .replace(/\]$/, '') // Remove trailing ]
        .replace(/^</, '')  // Remove leading <
        .replace(/>$/, ''); // Remove trailing >
      
      // Check if it's optional (was in brackets)
      const isOptional = frontmatter['argument-hint'].startsWith('[');
      
      if (!isOptional) {
        // For required arguments, add a placeholder
        shellCommand += ` ${this.escapeShellArg(`<${hint}>`)}`;
      }
    }
    
    // Copy command to clipboard and show visual feedback
    this.copyToClipboard(shellCommand, '.test-terminal', 'Test command copied!');
  }

  escapeShellArg(arg) {
    // If arg is empty or null, return empty quotes
    if (!arg) return "''";
    
    // If arg contains no special characters, return as-is
    if (/^[a-zA-Z0-9_\-./]+$/.test(arg)) {
      return arg;
    }
    
    // Otherwise, wrap in single quotes and escape single quotes
    return "'" + arg.replace(/'/g, "'\\''") + "'";
  }

  async copyToClipboard(text, buttonSelector, successMessage) {
    const button = this.container.querySelector(buttonSelector);
    const originalText = button.textContent;
    
    try {
      await navigator.clipboard.writeText(text);
      
      // Success feedback
      button.textContent = successMessage;
      button.style.background = '#4caf50';
      button.style.color = 'white';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
        button.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      
      // Error feedback
      button.textContent = 'Copy failed';
      button.style.background = '#f44336';
      button.style.color = 'white';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
        button.style.color = '';
      }, 2000);
    }
  }
  
  showCommandSkeleton() {
    const metadataCard = this.container.querySelector('.metadata-card');
    metadataCard.innerHTML = `
      <div class="command-viewer-skeleton skeleton-fade-in" role="status" aria-label="Loading command metadata">
        <span class="sr-only">Loading command metadata...</span>
        <div class="command-viewer-skeleton-card">
          <div class="skeleton command-viewer-skeleton-title"></div>
          <div class="skeleton skeleton-text long" style="margin-bottom: 20px;"></div>
          
          <div class="skeleton skeleton-text short" style="margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-text medium" style="margin-bottom: 20px;"></div>
          
          <div class="skeleton skeleton-text short" style="margin-bottom: 8px;"></div>
          <div class="command-viewer-skeleton-badges">
            <div class="skeleton command-viewer-skeleton-badge"></div>
            <div class="skeleton command-viewer-skeleton-badge"></div>
            <div class="skeleton command-viewer-skeleton-badge"></div>
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <div class="skeleton skeleton-button"></div>
            <div class="skeleton skeleton-button"></div>
          </div>
        </div>
      </div>
    `;
    
    // Also show skeleton in raw content
    this.container.querySelector('.raw-content').innerHTML = `
      <div class="editor-skeleton skeleton-fade-in" role="status" aria-label="Loading raw content">
        <span class="sr-only">Loading raw content...</span>
        <div class="skeleton skeleton-text full"></div>
        <div class="skeleton skeleton-text long"></div>
        <div class="skeleton skeleton-text medium"></div>
        <div class="skeleton skeleton-text long" style="margin-top: 16px;"></div>
        <div class="skeleton skeleton-text full"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    `;
  }
}

// Export for use in other modules
window.CommandViewer = CommandViewer;