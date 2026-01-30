// Import SSE client
import { SSEClient } from './sse-client.js';
import { MarkdownEditor } from './editor.js';

// Main application module
class LooppoolIDE {
    constructor() {
        this.fileTree = new FileTree();
        this.connectionStatus = new ConnectionStatus();
        this.sseClient = new SSEClient('/api/events');
        this.selectedFile = null;
        this.openFiles = new Map(); // path -> content
        this.editor = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize SSE connection
            this.setupSSE();
            
            // Initialize components
            await this.fileTree.init();
            this.connectionStatus.init();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start SSE connection
            this.sseClient.connect();
        } catch (error) {
            console.error('Failed to initialize IDE:', error);
            this.connectionStatus.setDisconnected();
        }
    }
    
    setupSSE() {
        // Monitor connection status
        this.sseClient.onConnection((event) => {
            switch (event.status) {
                case 'connected':
                    this.connectionStatus.setConnected();
                    break;
                case 'disconnected':
                case 'error':
                    this.connectionStatus.setDisconnected();
                    break;
                case 'reconnecting':
                    this.connectionStatus.setConnecting();
                    break;
            }
        });
        
        // Listen for file change events
        this.sseClient.on('file-changed', async (event) => {
            const data = JSON.parse(event.data);
            console.log('File changed:', data.path);
            
            // Reload file if currently open and not dirty
            if (this.selectedFile === data.path && this.editor && !this.editor.hasUnsavedChanges()) {
                await this.editor.loadFile(data.path);
            }
        });
        
        this.sseClient.on('file-created', async (event) => {
            const data = JSON.parse(event.data);
            console.log('File created:', data.path);
            
            // Refresh file tree
            await this.fileTree.refresh();
        });
        
        this.sseClient.on('file-deleted', async (event) => {
            const data = JSON.parse(event.data);
            console.log('File deleted:', data.path);
            
            // Refresh file tree
            await this.fileTree.refresh();
            
            // Clear editor if deleted file was open
            if (this.selectedFile === data.path) {
                this.selectedFile = null;
                if (this.editor) {
                    this.editor.destroy();
                    this.editor = null;
                }
                document.getElementById('welcome').style.display = 'flex';
            }
        });
    }
    
    setupEventListeners() {
        // File selection
        document.getElementById('file-tree').addEventListener('click', (e) => {
            const item = e.target.closest('.tree-item');
            if (item) {
                this.handleFileSelect(item);
            }
        });
        
        // Keyboard navigation
        document.getElementById('file-tree').addEventListener('keydown', (e) => {
            this.handleTreeKeyDown(e);
        });
        
        // Collapse all button
        document.getElementById('collapse-all').addEventListener('click', () => {
            this.fileTree.collapseAll();
        });
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl+S is already handled by the editor
            // Add other global shortcuts here as needed
        });
        
        // Handle beforeunload to warn about unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.editor && this.editor.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }
    
    handleTreeKeyDown(e) {
        const activeElement = document.activeElement;
        if (!activeElement.classList.contains('tree-item-content')) {
            return;
        }
        
        const currentItem = activeElement.parentElement;
        let handled = true;
        
        switch (e.key) {
            case 'ArrowUp':
                this.navigateTreeUp(currentItem);
                break;
            case 'ArrowDown':
                this.navigateTreeDown(currentItem);
                break;
            case 'ArrowLeft':
                this.navigateTreeLeft(currentItem);
                break;
            case 'ArrowRight':
                this.navigateTreeRight(currentItem);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault(); // Prevent scrolling on space
                this.handleFileSelect(currentItem);
                break;
            case 'Home':
                this.navigateTreeFirst();
                break;
            case 'End':
                this.navigateTreeLast();
                break;
            default:
                handled = false;
        }
        
        if (handled) {
            e.preventDefault();
        }
    }
    
    navigateTreeUp(currentItem) {
        const items = this.getVisibleTreeItems();
        const currentIndex = items.indexOf(currentItem);
        
        if (currentIndex > 0) {
            items[currentIndex - 1].querySelector('.tree-item-content').focus();
        }
    }
    
    navigateTreeDown(currentItem) {
        const items = this.getVisibleTreeItems();
        const currentIndex = items.indexOf(currentItem);
        
        if (currentIndex < items.length - 1) {
            items[currentIndex + 1].querySelector('.tree-item-content').focus();
        }
    }
    
    navigateTreeLeft(currentItem) {
        const isDirectory = currentItem.dataset.type === 'directory';
        const isExpanded = this.fileTree.expandedPaths.has(currentItem.dataset.path);
        
        if (isDirectory && isExpanded) {
            // Collapse directory
            this.fileTree.toggleDirectory(currentItem);
        } else {
            // Navigate to parent
            const parentList = currentItem.parentElement.parentElement;
            if (parentList && parentList.classList.contains('tree-item')) {
                parentList.querySelector('.tree-item-content').focus();
            }
        }
    }
    
    navigateTreeRight(currentItem) {
        const isDirectory = currentItem.dataset.type === 'directory';
        const isExpanded = this.fileTree.expandedPaths.has(currentItem.dataset.path);
        
        if (isDirectory) {
            if (!isExpanded) {
                // Expand directory
                this.fileTree.toggleDirectory(currentItem);
            } else {
                // Navigate to first child if expanded
                const firstChild = currentItem.querySelector('.tree-item');
                if (firstChild) {
                    firstChild.querySelector('.tree-item-content').focus();
                }
            }
        }
    }
    
    navigateTreeFirst() {
        const items = this.getVisibleTreeItems();
        if (items.length > 0) {
            items[0].querySelector('.tree-item-content').focus();
        }
    }
    
    navigateTreeLast() {
        const items = this.getVisibleTreeItems();
        if (items.length > 0) {
            items[items.length - 1].querySelector('.tree-item-content').focus();
        }
    }
    
    getVisibleTreeItems() {
        return Array.from(document.querySelectorAll('#file-tree .tree-item')).filter(item => {
            return item.offsetParent !== null; // Check if visible
        });
    }
    
    handleFileSelect(item) {
        const path = item.dataset.path;
        const isDirectory = item.dataset.type === 'directory';
        
        if (isDirectory) {
            this.fileTree.toggleDirectory(item);
        } else {
            this.selectFile(path);
        }
    }
    
    async selectFile(path) {
        // Update UI selection
        document.querySelectorAll('.tree-item-content').forEach(el => {
            el.classList.remove('selected');
        });
        
        const item = document.querySelector(`[data-path="${path}"]`);
        if (item) {
            item.querySelector('.tree-item-content').classList.add('selected');
        }
        
        // Hide welcome screen
        document.getElementById('welcome').style.display = 'none';
        
        // Initialize editor if not already created
        if (!this.editor) {
            const editorContainer = document.getElementById('editor-container');
            this.editor = new MarkdownEditor(editorContainer);
        }
        
        // Load file in editor
        this.selectedFile = path;
        await this.editor.loadFile(path);
    }
}

// File Tree Component
class FileTree {
    constructor() {
        this.treeData = null;
        this.expandedPaths = new Set();
        this.virtualScroller = null;
    }
    
    async init() {
        await this.loadTree();
        this.render();
        
        // Set up virtual scrolling for performance
        this.setupVirtualScrolling();
    }
    
    async loadTree() {
        const response = await fetch('/api/tree');
        if (!response.ok) {
            throw new Error('Failed to load file tree');
        }
        
        this.treeData = await response.json();
    }
    
    async refresh() {
        // Save current expanded paths
        const wasExpanded = new Set(this.expandedPaths);
        
        // Reload tree data
        await this.loadTree();
        
        // Restore expanded paths that still exist
        this.expandedPaths = new Set();
        for (const path of wasExpanded) {
            if (this.findNode(path)) {
                this.expandedPaths.add(path);
            }
        }
        
        // Re-render
        this.render();
    }
    
    render() {
        const container = document.getElementById('file-tree');
        container.innerHTML = '';
        
        if (this.treeData) {
            this.renderNode(this.treeData, container, 0);
        }
    }
    
    renderNode(node, container, depth) {
        const li = document.createElement('li');
        li.className = 'tree-item';
        li.dataset.path = node.path;
        li.dataset.type = node.type;
        li.setAttribute('role', 'treeitem');
        
        const content = document.createElement('div');
        content.className = 'tree-item-content';
        content.tabIndex = 0;
        content.setAttribute('aria-label', `${node.type === 'directory' ? 'Folder' : 'File'} ${node.name}`);
        
        // Indentation
        const indent = document.createElement('span');
        indent.className = 'tree-indent';
        indent.style.width = `${depth * 16}px`;
        content.appendChild(indent);
        
        // Arrow for directories
        const arrow = document.createElement('span');
        arrow.className = 'tree-arrow';
        if (node.type === 'directory' && node.children) {
            arrow.textContent = '▶';
            if (this.expandedPaths.has(node.path)) {
                arrow.classList.add('expanded');
                arrow.style.transform = 'rotate(90deg)';
                content.setAttribute('aria-expanded', 'true');
            } else {
                content.setAttribute('aria-expanded', 'false');
            }
        } else {
            arrow.classList.add('leaf');
        }
        content.appendChild(arrow);
        
        // Icon with file type class
        const icon = document.createElement('span');
        icon.className = 'tree-icon';
        
        if (node.type === 'directory') {
            icon.classList.add('icon-folder');
        } else {
            // Get file extension
            const ext = node.name.lastIndexOf('.') > 0 
                ? node.name.substring(node.name.lastIndexOf('.') + 1).toLowerCase()
                : '';
            
            // Map extensions to icon classes
            const iconClass = this.getFileIconClass(ext, node.name);
            icon.classList.add(iconClass);
        }
        
        content.appendChild(icon);
        
        // Label
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = node.name;
        content.appendChild(label);
        
        li.appendChild(content);
        container.appendChild(li);
        
        // Render children if expanded
        if (node.type === 'directory' && node.children && this.expandedPaths.has(node.path)) {
            const childContainer = document.createElement('ul');
            childContainer.setAttribute('role', 'group');
            li.appendChild(childContainer);
            
            node.children.forEach(child => {
                this.renderNode(child, childContainer, depth + 1);
            });
        }
    }
    
    toggleDirectory(item) {
        const path = item.dataset.path;
        const arrow = item.querySelector('.tree-arrow');
        const content = item.querySelector('.tree-item-content');
        
        if (this.expandedPaths.has(path)) {
            this.expandedPaths.delete(path);
            arrow.style.transform = 'rotate(0deg)';
            content.setAttribute('aria-expanded', 'false');
            
            // Remove children
            const childList = item.querySelector('ul');
            if (childList) {
                childList.remove();
            }
        } else {
            this.expandedPaths.add(path);
            arrow.style.transform = 'rotate(90deg)';
            content.setAttribute('aria-expanded', 'true');
            
            // Find node data and render children
            const node = this.findNode(path);
            if (node && node.children) {
                const childContainer = document.createElement('ul');
                childContainer.setAttribute('role', 'group');
                item.appendChild(childContainer);
                
                node.children.forEach(child => {
                    this.renderNode(child, childContainer, this.getDepth(path) + 1);
                });
            }
        }
    }
    
    collapseAll() {
        this.expandedPaths.clear();
        this.render();
    }
    
    findNode(path, node = this.treeData) {
        if (node.path === path) {
            return node;
        }
        
        if (node.children) {
            for (const child of node.children) {
                const found = this.findNode(path, child);
                if (found) return found;
            }
        }
        
        return null;
    }
    
    getDepth(path) {
        return path.split('/').filter(p => p).length - 1;
    }
    
    setupVirtualScrolling() {
        const container = document.getElementById('file-tree-container');
        const itemHeight = 22; // Height of each tree item
        
        // Simple virtual scrolling for large file trees
        container.addEventListener('scroll', () => {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            
            // Calculate visible range
            const startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
            
            // TODO: Implement actual virtual scrolling when file count > 100
            // For now, browser handles it reasonably well up to ~1000 items
        });
    }
    
    /**
     * Get icon class for file based on extension or name
     */
    getFileIconClass(ext, filename) {
        // Special filenames
        const specialFiles = {
            'package.json': 'icon-npm',
            'package-lock.json': 'icon-npm',
            '.gitignore': 'icon-git',
            '.gitattributes': 'icon-git',
            'readme.md': 'icon-markdown',
            'changelog.md': 'icon-markdown',
            'license': 'icon-certificate',
            'license.md': 'icon-certificate',
            'dockerfile': 'icon-docker',
            '.dockerignore': 'icon-docker',
            'makefile': 'icon-settings',
            '.env': 'icon-settings',
            '.editorconfig': 'icon-settings',
            'tsconfig.json': 'icon-typescript',
            '.eslintrc': 'icon-eslint',
            '.eslintrc.js': 'icon-eslint',
            '.eslintrc.json': 'icon-eslint'
        };
        
        const lowerFilename = filename.toLowerCase();
        if (specialFiles[lowerFilename]) {
            return specialFiles[lowerFilename];
        }
        
        // Extension mappings
        const extMap = {
            // Programming languages
            'js': 'icon-javascript',
            'jsx': 'icon-react',
            'ts': 'icon-typescript',
            'tsx': 'icon-react',
            'py': 'icon-python',
            'rb': 'icon-ruby',
            'java': 'icon-java',
            'c': 'icon-c',
            'cpp': 'icon-cpp',
            'cc': 'icon-cpp',
            'h': 'icon-c',
            'hpp': 'icon-cpp',
            'go': 'icon-go',
            'rs': 'icon-rust',
            'php': 'icon-php',
            'cs': 'icon-csharp',
            'swift': 'icon-swift',
            'kt': 'icon-kotlin',
            'scala': 'icon-scala',
            'r': 'icon-r',
            'lua': 'icon-lua',
            'dart': 'icon-dart',
            
            // Markup & Style
            'html': 'icon-html',
            'htm': 'icon-html',
            'css': 'icon-css',
            'scss': 'icon-sass',
            'sass': 'icon-sass',
            'less': 'icon-less',
            'xml': 'icon-xml',
            'svg': 'icon-svg',
            'md': 'icon-markdown',
            'mdx': 'icon-markdown',
            
            // Data & Config
            'json': 'icon-json',
            'yaml': 'icon-yaml',
            'yml': 'icon-yaml',
            'toml': 'icon-toml',
            'ini': 'icon-settings',
            'conf': 'icon-settings',
            'config': 'icon-settings',
            
            // Documents
            'pdf': 'icon-pdf',
            'doc': 'icon-document',
            'docx': 'icon-document',
            'txt': 'icon-text',
            'rtf': 'icon-document',
            
            // Images
            'jpg': 'icon-image',
            'jpeg': 'icon-image',
            'png': 'icon-image',
            'gif': 'icon-image',
            'bmp': 'icon-image',
            'ico': 'icon-image',
            'webp': 'icon-image',
            
            // Archives
            'zip': 'icon-archive',
            'tar': 'icon-archive',
            'gz': 'icon-archive',
            'rar': 'icon-archive',
            '7z': 'icon-archive',
            
            // Shell
            'sh': 'icon-terminal',
            'bash': 'icon-terminal',
            'zsh': 'icon-terminal',
            'fish': 'icon-terminal',
            'ps1': 'icon-terminal',
            'bat': 'icon-terminal',
            'cmd': 'icon-terminal',
            
            // Other
            'log': 'icon-log',
            'sql': 'icon-database',
            'db': 'icon-database',
            'lock': 'icon-lock'
        };
        
        return extMap[ext] || 'icon-file';
    }
}

// Connection Status Component
class ConnectionStatus {
    constructor() {
        this.statusEl = document.getElementById('connection-status');
        this.dotEl = this.statusEl.querySelector('.status-dot');
        this.textEl = this.statusEl.querySelector('.status-text');
        this.connected = false;
    }
    
    init() {
        // Will be replaced with SSE connection later
        this.setConnecting();
    }
    
    setConnected() {
        this.connected = true;
        this.dotEl.className = 'status-dot connected';
        this.textEl.textContent = 'Connected';
    }
    
    setDisconnected() {
        this.connected = false;
        this.dotEl.className = 'status-dot disconnected';
        this.textEl.textContent = 'Disconnected';
    }
    
    setConnecting() {
        this.connected = false;
        this.dotEl.className = 'status-dot';
        this.textEl.textContent = 'Connecting...';
    }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ide = new LooppoolIDE();
    });
} else {
    window.ide = new LooppoolIDE();
}