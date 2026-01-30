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
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Create EventSource client
  const sseClient = new EventSourceClient('/api/events');
  
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

  // Connect
  sseClient.connect();

  // Export for global access
  window.sseClient = sseClient;
});