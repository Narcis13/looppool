/**
 * Telemetry-free analytics using localStorage
 * Tracks user interactions and usage patterns without sending data to external services
 */
class Analytics {
  constructor() {
    this.storageKey = 'lpl-ide-analytics';
    this.sessionKey = 'lpl-ide-session';
    this.initSession();
    this.setupEventTrackers();
  }

  /**
   * Initialize or continue session
   */
  initSession() {
    let session = this.getSession();
    const now = Date.now();
    
    // Start new session if none exists or if last activity was over 30 minutes ago
    if (!session || now - session.lastActivity > 30 * 60 * 1000) {
      session = {
        id: this.generateSessionId(),
        startTime: now,
        lastActivity: now
      };
    } else {
      session.lastActivity = now;
    }
    
    this.saveSession(session);
    this.currentSession = session;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get stored analytics data
   */
  getData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : this.getDefaultData();
    } catch (e) {
      console.error('Failed to load analytics data:', e);
      return this.getDefaultData();
    }
  }

  /**
   * Get default analytics structure
   */
  getDefaultData() {
    return {
      version: '1.0',
      firstUse: Date.now(),
      lastUse: Date.now(),
      sessions: [],
      features: {
        fileOpens: 0,
        fileSaves: 0,
        findUsed: 0,
        replaceUsed: 0,
        vimModeUsed: 0,
        quickOpenUsed: 0,
        graphViewed: 0,
        commandsViewed: 0,
        stateViewed: 0
      },
      editors: {
        totalEditTime: 0,
        linesAdded: 0,
        linesDeleted: 0,
        charactersTyped: 0
      },
      errors: {
        total: 0,
        byType: {}
      },
      performance: {
        fileLoadTimes: [],
        fileSaveTimes: [],
        graphRenderTimes: []
      }
    };
  }

  /**
   * Save analytics data
   */
  saveData(data) {
    try {
      data.lastUse = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save analytics data:', e);
    }
  }

  /**
   * Get current session
   */
  getSession() {
    try {
      const session = localStorage.getItem(this.sessionKey);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Save session data
   */
  saveSession(session) {
    try {
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  }

  /**
   * Track a feature usage
   */
  trackFeature(featureName) {
    const data = this.getData();
    if (data.features[featureName] !== undefined) {
      data.features[featureName]++;
      this.saveData(data);
    }
  }

  /**
   * Track an error
   */
  trackError(error, context = '') {
    const data = this.getData();
    data.errors.total++;
    
    const errorType = error.name || 'Unknown';
    if (!data.errors.byType[errorType]) {
      data.errors.byType[errorType] = 0;
    }
    data.errors.byType[errorType]++;
    
    this.saveData(data);
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric, value) {
    const data = this.getData();
    
    if (metric === 'fileLoad' && data.performance.fileLoadTimes) {
      data.performance.fileLoadTimes.push(value);
      // Keep only last 100 entries
      if (data.performance.fileLoadTimes.length > 100) {
        data.performance.fileLoadTimes.shift();
      }
    } else if (metric === 'fileSave' && data.performance.fileSaveTimes) {
      data.performance.fileSaveTimes.push(value);
      if (data.performance.fileSaveTimes.length > 100) {
        data.performance.fileSaveTimes.shift();
      }
    } else if (metric === 'graphRender' && data.performance.graphRenderTimes) {
      data.performance.graphRenderTimes.push(value);
      if (data.performance.graphRenderTimes.length > 100) {
        data.performance.graphRenderTimes.shift();
      }
    }
    
    this.saveData(data);
  }

  /**
   * Track editor activity
   */
  trackEditorActivity(activity, value) {
    const data = this.getData();
    
    if (data.editors[activity] !== undefined) {
      data.editors[activity] += value;
      this.saveData(data);
    }
  }

  /**
   * Get analytics summary
   */
  getSummary() {
    const data = this.getData();
    const now = Date.now();
    const daysSinceFirstUse = Math.floor((now - data.firstUse) / (1000 * 60 * 60 * 24));
    
    const avgFileLoadTime = data.performance.fileLoadTimes.length > 0
      ? data.performance.fileLoadTimes.reduce((a, b) => a + b, 0) / data.performance.fileLoadTimes.length
      : 0;
      
    const avgFileSaveTime = data.performance.fileSaveTimes.length > 0
      ? data.performance.fileSaveTimes.reduce((a, b) => a + b, 0) / data.performance.fileSaveTimes.length
      : 0;
      
    const avgGraphRenderTime = data.performance.graphRenderTimes.length > 0
      ? data.performance.graphRenderTimes.reduce((a, b) => a + b, 0) / data.performance.graphRenderTimes.length
      : 0;
    
    return {
      daysSinceFirstUse,
      totalSessions: data.sessions.length,
      features: data.features,
      editors: data.editors,
      errors: data.errors,
      performance: {
        avgFileLoadTime: Math.round(avgFileLoadTime),
        avgFileSaveTime: Math.round(avgFileSaveTime),
        avgGraphRenderTime: Math.round(avgGraphRenderTime)
      }
    };
  }

  /**
   * Clear all analytics data
   */
  clearData() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.sessionKey);
    } catch (e) {
      console.error('Failed to clear analytics:', e);
    }
  }

  /**
   * Setup event trackers
   */
  setupEventTrackers() {
    // Track file operations
    document.addEventListener('open-file', () => this.trackFeature('fileOpens'));
    document.addEventListener('file-saved', () => this.trackFeature('fileSaves'));
    
    // Track feature usage
    document.addEventListener('find-opened', () => this.trackFeature('findUsed'));
    document.addEventListener('replace-used', () => this.trackFeature('replaceUsed'));
    document.addEventListener('vim-mode-toggled', () => this.trackFeature('vimModeUsed'));
    document.addEventListener('quick-open-used', () => this.trackFeature('quickOpenUsed'));
    document.addEventListener('graph-viewed', () => this.trackFeature('graphViewed'));
    document.addEventListener('command-viewed', () => this.trackFeature('commandsViewed'));
    document.addEventListener('state-viewed', () => this.trackFeature('stateViewed'));
    
    // Track errors
    window.addEventListener('error', (e) => {
      this.trackError(e.error || new Error(e.message), 'window.error');
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      this.trackError(new Error(e.reason), 'unhandledrejection');
    });
    
    // Track session end
    window.addEventListener('beforeunload', () => {
      const data = this.getData();
      const sessionDuration = Date.now() - this.currentSession.startTime;
      
      data.sessions.push({
        id: this.currentSession.id,
        duration: sessionDuration,
        timestamp: this.currentSession.startTime
      });
      
      // Keep only last 50 sessions
      if (data.sessions.length > 50) {
        data.sessions = data.sessions.slice(-50);
      }
      
      this.saveData(data);
    });
  }
}

// Export for use in other modules
window.Analytics = Analytics;