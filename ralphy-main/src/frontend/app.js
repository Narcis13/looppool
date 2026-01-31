// ETag cache for storing file ETags
class ETagCache {
  constructor() {
    this.cache = new Map();
  }
  
  get(path) {
    return this.cache.get(path);
  }
  
  set(path, etag) {
    this.cache.set(path, etag);
  }
  
  delete(path) {
    this.cache.delete(path);
  }
  
  clear() {
    this.cache.clear();
  }
}

// Operation queue for handling operations during disconnection
class OperationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxQueueSize = 100;
    this.etagCache = new ETagCache();
  }

  enqueue(operation) {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('Operation queue is full, dropping oldest operation');
      this.queue.shift();
    }
    
    this.queue.push({
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      ...operation
    });
    
    return this.queue[this.queue.length - 1].id;
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    while (this.queue.length > 0) {
      const operation = this.queue[0];
      
      try {
        console.log(`Processing queued operation: ${operation.type}`);
        const result = await this.executeOperation(operation);
        
        // Operation succeeded, remove from queue
        this.queue.shift();
        
        // Call success callback if provided
        if (operation.onSuccess) {
          operation.onSuccess(result);
        }
      } catch (error) {
        console.error(`Failed to process operation: ${operation.type}`, error);
        
        // Check if we should retry
        if (operation.retryCount >= (operation.maxRetries || 3)) {
          // Max retries reached, remove from queue
          this.queue.shift();
          
          // Call error callback if provided
          if (operation.onError) {
            operation.onError(error);
          }
        } else {
          // Increment retry count and keep in queue
          operation.retryCount = (operation.retryCount || 0) + 1;
          
          // Move to next operation (will retry this one later)
          break;
        }
      }
    }
    
    this.processing = false;
  }

  async executeOperation(operation) {
    switch (operation.type) {
      case 'saveFile':
        // Track start time for performance metrics
        const saveStartTime = Date.now();
        
        const saveResponse = await asyncErrorHandler.wrapFetch(`/api/file?path=${encodeURIComponent(operation.path)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: operation.content
        });
        
        if (!saveResponse.ok) {
          throw new Error(`Failed to save file: ${saveResponse.status}`);
        }
        
        // Invalidate ETag cache for this file after save
        this.etagCache.delete(operation.path);
        
        const result = await saveResponse.text();
        
        // Track performance metric
        const saveTime = Date.now() - saveStartTime;
        if (window.analytics) {
          window.analytics.trackPerformance('fileSave', saveTime);
        }
        
        return result;
        
      case 'loadFile':
        // Track start time for performance metrics
        const loadStartTime = Date.now();
        
        // Check if we have a cached ETag for this file
        const cachedEtag = this.etagCache.get(operation.path);
        const headers = {};
        
        if (cachedEtag) {
          headers['If-None-Match'] = cachedEtag;
        }
        
        const loadResponse = await asyncErrorHandler.wrapFetch(`/api/file?path=${encodeURIComponent(operation.path)}`, {
          headers
        });
        
        // Handle 304 Not Modified
        if (loadResponse.status === 304) {
          // File hasn't changed, we need to get it from browser cache or return a special value
          // Since the browser will handle caching, we can indicate this is a cache hit
          return { cached: true, content: operation.cachedContent || '' };
        }
        
        if (!loadResponse.ok) {
          throw new Error(`Failed to load file: ${loadResponse.status}`);
        }
        
        // Extract ETag from response headers
        const etag = loadResponse.headers.get('ETag');
        if (etag) {
          this.etagCache.set(operation.path, etag);
        }
        
        const content = await loadResponse.text();
        
        // Track performance metric
        const loadTime = Date.now() - loadStartTime;
        if (window.analytics) {
          window.analytics.trackPerformance('fileLoad', loadTime);
        }
        
        return { cached: false, content };
        
      case 'loadTree':
        const treeResponse = await asyncErrorHandler.wrapFetch('/api/tree');
        
        if (!treeResponse.ok) {
          throw new Error(`Failed to load tree: ${treeResponse.status}`);
        }
        
        return await treeResponse.json();
        
      case 'loadState':
        const stateResponse = await asyncErrorHandler.wrapFetch('/api/state');
        
        if (!stateResponse.ok) {
          throw new Error(`Failed to load state: ${stateResponse.status}`);
        }
        
        return await stateResponse.text();
        
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  clear() {
    this.queue = [];
  }

  getQueueLength() {
    return this.queue.length;
  }

  getQueue() {
    return [...this.queue];
  }
}

class EventSourceClient {
  constructor(url) {
    this.url = url;
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.baseDelay = 1000; // 1 second base delay
    this.maxDelay = 30000; // 30 seconds max delay
    this.maxAttempts = 10;
    this.listeners = new Map();
    this.isConnected = false;
    this.connectionStatusElement = null;
    this.operationQueue = new OperationQueue();
  }

  setConnectionStatusElement(element) {
    this.connectionStatusElement = element;
  }

  updateConnectionStatus(status) {
    if (this.connectionStatusElement) {
      this.connectionStatusElement.textContent = status;
      this.connectionStatusElement.className = `connection-status ${status.toLowerCase().replace(/\s/g, '-')}`;
    }
  }

  connect() {
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    this.updateConnectionStatus('Connecting...');
    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      console.log('EventSource connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('Connected');
      
      // Process any queued operations when connection is restored
      if (this.operationQueue.getQueueLength() > 0) {
        console.log(`Processing ${this.operationQueue.getQueueLength()} queued operations`);
        this.operationQueue.processQueue();
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      this.isConnected = false;
      this.updateConnectionStatus('Disconnected');
      this.eventSource.close();
      this.scheduleReconnect();
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (error) {
        console.error('Failed to parse event data:', error);
      }
    };
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateConnectionStatus('Connection Failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxDelay
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxAttempts})`);
    this.updateConnectionStatus(`Reconnecting... (${this.reconnectAttempts}/${this.maxAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      this.updateConnectionStatus('Disconnected');
    }
  }

  // Queue an operation for execution
  queueOperation(operation) {
    return this.operationQueue.enqueue(operation);
  }

  // Get the operation queue for inspection
  getOperationQueue() {
    return this.operationQueue;
  }
}

// API wrapper for handling operations with automatic queueing
class API {
  constructor(sseClient) {
    this.sseClient = sseClient;
  }

  // Helper to execute or queue operation based on connection status
  async executeOrQueue(operation) {
    // Wrap with async error handler
    const wrappedExecute = asyncErrorHandler.wrapAsync(
      async () => {
        if (this.sseClient.isConnected) {
          // Try to execute immediately
          try {
            const queue = this.sseClient.getOperationQueue();
            return await queue.executeOperation(operation);
          } catch (error) {
            // If immediate execution fails, queue the operation
            console.warn(`Failed to execute operation immediately, queueing: ${operation.type}`, error);
            this.sseClient.queueOperation(operation);
            throw error;
          }
        } else {
          // Not connected, queue the operation
          console.log(`Queueing operation while disconnected: ${operation.type}`);
          this.sseClient.queueOperation(operation);
          throw new Error('Operation queued - currently disconnected');
        }
      },
      'API',
      operation.type
    );
    
    return await wrappedExecute();
  }

  async saveFile(path, content, options = {}) {
    return this.executeOrQueue({
      type: 'saveFile',
      path,
      content,
      maxRetries: options.maxRetries || 3,
      onSuccess: options.onSuccess,
      onError: options.onError
    });
  }

  async loadFile(path, options = {}) {
    const result = await this.executeOrQueue({
      type: 'loadFile',
      path,
      cachedContent: options.cachedContent,
      maxRetries: options.maxRetries || 3,
      onSuccess: options.onSuccess,
      onError: options.onError
    });
    
    // For backward compatibility, return just the content if not from cache
    if (result && typeof result === 'object' && 'content' in result) {
      return result.content;
    }
    return result;
  }

  async loadTree(options = {}) {
    return this.executeOrQueue({
      type: 'loadTree',
      maxRetries: options.maxRetries || 3,
      onSuccess: options.onSuccess,
      onError: options.onError
    });
  }

  async loadState(options = {}) {
    return this.executeOrQueue({
      type: 'loadState',
      maxRetries: options.maxRetries || 3,
      onSuccess: options.onSuccess,
      onError: options.onError
    });
  }

  getQueuedOperations() {
    return this.sseClient.getOperationQueue().getQueue();
  }

  clearQueue() {
    this.sseClient.getOperationQueue().clear();
  }

  isConnected() {
    return this.sseClient.isConnected;
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Create EventSource client
  const sseClient = new EventSourceClient('/api/events');
  
  // Create API wrapper
  const api = new API(sseClient);
  
  // Set up connection status indicator
  const connectionStatus = document.getElementById('connection-status');
  if (connectionStatus) {
    sseClient.setConnectionStatusElement(connectionStatus);
  }

  // Listen for file change events
  sseClient.on('message', (data) => {
    if (data.type === 'fileChange') {
      console.log('File changed:', data.path);
      // Handle file changes here
    }
  });

  // Listen for open-file events (from graph, command viewer, state panel, etc.)
  window.addEventListener('open-file', async (event) => {
    const path = event.detail.path;
    if (!path) return;
    
    console.log('Opening file:', path);
    
    // Track file open
    if (window.analytics) {
      window.analytics.trackFeature('fileOpens');
    }
    
    // Show skeleton loader in editor while loading
    if (window.editor) {
      window.editor.showLoadingSkeleton(path);
    }
    
    try {
      // Load the file content
      const content = await api.loadFile(path);
      
      // Open in editor if editor is available
      if (window.editor) {
        window.editor.loadFile(path, content);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      if (window.editor) {
        window.editor.showError(`Failed to load file: ${error.message}`);
      }
      alert(`Failed to open file: ${error.message}`);
    }
  });

  // Connect
  sseClient.connect();

  // Export for global access
  window.sseClient = sseClient;
  window.api = api;
});