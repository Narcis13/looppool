class StatePanel {
  constructor(container) {
    this.container = container;
    this.refreshInterval = null;
    this.eventSource = null;
    this.projectData = null;
    this.roadmapData = null;
    this.planData = null;
    this.planningDocs = [
      { name: 'PROJECT.md', path: 'PROJECT.md', expanded: true },
      { name: 'ROADMAP.md', path: 'ROADMAP.md', expanded: false },
      { name: 'PLAN.md', path: 'PLAN.md', expanded: false },
      { name: 'DECISIONS.md', path: 'DECISIONS.md', expanded: false },
      { name: 'CONTINUE_HERE.md', path: 'CONTINUE_HERE.md', expanded: false }
    ];
    this.init();
  }

  init() {
    this.container.className = 'state-panel';
    this.render();
    this.startAutoRefresh();
    this.setupSSE();
    this.setupPlanningDocHandlers();
  }

  render() {
    this.container.innerHTML = `
      <div class="state-panel-header">
        <h2>Project State</h2>
        <button class="refresh-btn" id="refresh-btn">⟳ Refresh</button>
      </div>
      <div class="state-panel-content">
        ${this.renderStateSkeleton()}
      </div>
    `;
    
    document.getElementById('refresh-btn').addEventListener('click', () => this.loadState());
  }
  
  renderStateSkeleton() {
    return `
      <div class="state-panel-skeleton skeleton-fade-in">
        <!-- Planning docs skeleton -->
        <div class="state-panel-skeleton-section">
          <div class="skeleton state-panel-skeleton-header"></div>
          <div class="skeleton skeleton-text medium"></div>
          <div class="skeleton skeleton-text long"></div>
          <div class="skeleton skeleton-text short" style="margin-top: 10px;"></div>
        </div>
        
        <!-- Quick actions skeleton -->
        <div class="state-panel-skeleton-section">
          <div class="skeleton state-panel-skeleton-header" style="width: 40%;"></div>
          <div style="display: flex; gap: 10px; margin-top: 12px;">
            <div class="skeleton skeleton-button"></div>
            <div class="skeleton skeleton-button"></div>
            <div class="skeleton skeleton-button"></div>
          </div>
        </div>
        
        <!-- Task completion skeleton -->
        <div class="state-panel-skeleton-section">
          <div class="skeleton state-panel-skeleton-header" style="width: 50%;"></div>
          <div class="skeleton state-panel-skeleton-circular"></div>
          <div class="skeleton skeleton-text medium" style="margin: 0 auto; width: 60%;"></div>
        </div>
        
        <!-- Progress bars skeleton -->
        <div class="state-panel-skeleton-section">
          <div class="skeleton skeleton-text short"></div>
          <div class="skeleton state-panel-skeleton-progress"></div>
          <div class="skeleton skeleton-text short" style="margin-top: 12px;"></div>
          <div class="skeleton state-panel-skeleton-progress"></div>
        </div>
      </div>
    `;
  }

  async loadState() {
    try {
      const response = await fetch('/api/state');
      const data = await response.json();
      
      if (data.error) {
        this.renderError(data.error);
      } else {
        this.renderState(data.content);
      }
    } catch (error) {
      this.renderError(`Failed to load state: ${error.message}`);
    }
  }

  async renderState(content) {
    const contentDiv = this.container.querySelector('.state-panel-content');
    
    if (!content || content.trim() === '') {
      contentDiv.innerHTML = `
        <div class="empty-state">
          <h3>No current state file found</h3>
          <p>The planning state will appear here once a project is initialized.</p>
        </div>
      `;
      return;
    }

    // Load PROJECT.md
    const projectHtml = await this.loadProjectMd();
    this.projectData = projectHtml;
    
    // Load ROADMAP.md
    const roadmapData = await this.loadRoadmapMd();
    this.roadmapData = roadmapData;
    
    // Load PLAN.md and calculate completion
    const planData = await this.loadPlanMd();
    this.planData = planData;
    
    // Parse markdown sections
    const sections = this.parseSections(content);
    
    // Render sections
    let html = '<div class="state-sections">';
    
    // Add collapsible planning document tree
    html += this.renderPlanningDocTree();
    
    // Add resume work button
    html += this.renderResumeWorkButton();
    
    // Load initially expanded documents
    setTimeout(() => {
      this.planningDocs.forEach(doc => {
        if (doc.expanded) {
          this.loadDocumentContent(doc.path);
        }
      });
    }, 0);
    
    // Add PROJECT.md section if available
    if (projectHtml) {
      html += `
        <div class="state-section project-section">
          <h3>Project Overview</h3>
          <div class="section-content markdown-content">${projectHtml}</div>
        </div>
      `;
    }
    
    // Add ROADMAP.md milestones if available
    if (roadmapData && roadmapData.phases.length > 0) {
      html += `
        <div class="state-section roadmap-section">
          <h3>Project Phases</h3>
          <div class="section-content">
            ${this.renderRoadmapPhases(roadmapData.phases)}
          </div>
        </div>
      `;
    }
    
    // Add PLAN.md task completion if available
    if (planData && planData.tasks) {
      const percentage = this.calculateTaskCompletion(planData.tasks);
      html += `
        <div class="state-section plan-section">
          <h3>Task Progress</h3>
          <div class="section-content">
            <div class="task-completion-summary">
              <span class="completion-label">Overall Completion:</span>
              ${this.createCircularProgress(percentage, 100)}
              <div class="task-completion-details">
                <div class="progress-bar large">
                  <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="progress-value">${percentage}%</span>
                <div class="task-stats">
                  <span>${planData.completedCount} of ${planData.totalCount} tasks completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    sections.forEach(section => {
      html += `<div class="state-section">`;
      html += `<h3>${this.escapeHtml(section.title)}</h3>`;
      
      if (section.content.includes('%') || section.content.match(/\d+\/\d+/)) {
        // Render progress bars
        html += this.renderProgressBars(section.content);
      } else if (section.content.match(/^\s*-\s+/m)) {
        // Render lists
        html += this.renderList(section.content);
      } else if (section.content.match(/^\s*\[[ x]\]/m)) {
        // Render checkboxes
        html += this.renderCheckboxes(section.content);
      } else {
        // Render as paragraphs
        html += `<div class="section-content">${this.escapeHtml(section.content)}</div>`;
      }
      
      html += `</div>`;
    });
    
    html += '</div>';
    contentDiv.innerHTML = html;
  }

  parseSections(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;
    
    lines.forEach(line => {
      const h2Match = line.match(/^##\s+(.+)/);
      const h3Match = line.match(/^###\s+(.+)/);
      
      if (h2Match || h3Match) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: (h2Match || h3Match)[1],
          level: h2Match ? 2 : 3,
          content: ''
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  renderProgressBars(content) {
    const lines = content.split('\n');
    let html = '<div class="progress-items">';
    
    lines.forEach(line => {
      const percentMatch = line.match(/(.+?):\s*(\d+)%/);
      const fractionMatch = line.match(/(.+?):\s*(\d+)\/(\d+)/);
      
      if (percentMatch) {
        const [_, label, percent] = percentMatch;
        html += `
          <div class="progress-item">
            <span class="progress-label">${this.escapeHtml(label)}</span>
            <div class="progress-indicators">
              ${this.createCircularProgress(percent, 60)}
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%"></div>
              </div>
              <span class="progress-value">${percent}%</span>
            </div>
          </div>
        `;
      } else if (fractionMatch) {
        const [_, label, current, total] = fractionMatch;
        const percent = Math.round((current / total) * 100);
        html += `
          <div class="progress-item">
            <span class="progress-label">${this.escapeHtml(label)}</span>
            <div class="progress-indicators">
              ${this.createCircularProgress(percent, 60)}
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%"></div>
              </div>
              <span class="progress-value">${current}/${total}</span>
            </div>
          </div>
        `;
      }
    });
    
    html += '</div>';
    return html;
  }

  renderList(content) {
    const lines = content.split('\n');
    let html = '<ul class="activity-list">';
    
    lines.forEach(line => {
      const match = line.match(/^\s*-\s+(.+)/);
      if (match) {
        const text = match[1];
        // Check for timestamp
        const timestampMatch = text.match(/^(\[[\d:]+\])\s*(.+)/);
        if (timestampMatch) {
          html += `<li><span class="timestamp">${timestampMatch[1]}</span> ${this.escapeHtml(timestampMatch[2])}</li>`;
        } else {
          html += `<li>${this.escapeHtml(text)}</li>`;
        }
      }
    });
    
    html += '</ul>';
    return html;
  }

  renderCheckboxes(content) {
    const lines = content.split('\n');
    let html = '<div class="task-list">';
    
    lines.forEach(line => {
      const match = line.match(/^\s*\[([x ])\]\s+(.+)/);
      if (match) {
        const checked = match[1] === 'x';
        html += `
          <div class="task-item ${checked ? 'completed' : ''}">
            <span class="checkbox">${checked ? '☑' : '☐'}</span>
            <span class="task-text">${this.escapeHtml(match[2])}</span>
          </div>
        `;
      }
    });
    
    html += '</div>';
    return html;
  }

  renderRoadmapPhases(phases) {
    let html = '<div class="roadmap-phases">';
    
    phases.forEach(phase => {
      html += `
        <div class="roadmap-phase">
          <h4 class="phase-name">${this.escapeHtml(phase.name)}</h4>
      `;
      
      if (phase.milestones.length > 0) {
        html += '<div class="phase-milestones">';
        
        phase.milestones.forEach(milestone => {
          html += `
            <div class="roadmap-milestone">
              <h5 class="milestone-name">${this.escapeHtml(milestone.name)}</h5>
          `;
          
          if (milestone.tasks.length > 0) {
            html += '<ul class="milestone-tasks">';
            milestone.tasks.forEach(task => {
              html += `<li>${this.escapeHtml(task)}</li>`;
            });
            html += '</ul>';
          }
          
          html += '</div>';
        });
        
        html += '</div>';
      }
      
      html += '</div>';
    });
    
    html += '</div>';
    return html;
  }

  renderError(error) {
    const contentDiv = this.container.querySelector('.state-panel-content');
    contentDiv.innerHTML = `
      <div class="error-state">
        <h3>Error loading state</h3>
        <p>${this.escapeHtml(error)}</p>
        <button onclick="window.statePanel.loadState()">Retry</button>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  startAutoRefresh() {
    // Load initial state
    this.loadState();
    
    // Refresh every 5 seconds
    this.refreshInterval = setInterval(() => {
      this.loadState();
    }, 5000);
  }

  setupSSE() {
    if (window.eventSource) {
      window.eventSource.addEventListener('file-change', (event) => {
        const data = JSON.parse(event.data);
        if (data.path && (data.path.includes('current-state.md') || 
            data.path.includes('PLAN.md') || 
            data.path.includes('PROJECT.md') || 
            data.path.includes('ROADMAP.md'))) {
          this.loadState();
        }
      });
    }
  }

  async loadProjectMd() {
    try {
      const response = await fetch('/api/file?path=PROJECT.md');
      if (!response.ok) {
        return null;
      }
      const text = await response.text();
      return this.parseMarkdown(text);
    } catch (error) {
      console.error('Failed to load PROJECT.md:', error);
      return null;
    }
  }

  async loadRoadmapMd() {
    try {
      const response = await fetch('/api/file?path=ROADMAP.md');
      if (!response.ok) {
        return null;
      }
      const text = await response.text();
      return this.parseRoadmapPhases(text);
    } catch (error) {
      console.error('Failed to load ROADMAP.md:', error);
      return null;
    }
  }

  parseRoadmapPhases(text) {
    const phases = [];
    const lines = text.split('\n');
    let currentPhase = null;
    let currentMilestone = null;
    
    for (const line of lines) {
      // Check for phase (## heading)
      const phaseMatch = line.match(/^##\s+(.+)/);
      if (phaseMatch) {
        if (currentPhase) {
          phases.push(currentPhase);
        }
        currentPhase = {
          name: phaseMatch[1],
          milestones: []
        };
        currentMilestone = null;
        continue;
      }
      
      // Check for milestone (### heading)
      const milestoneMatch = line.match(/^###\s+(.+)/);
      if (milestoneMatch && currentPhase) {
        currentMilestone = {
          name: milestoneMatch[1],
          tasks: []
        };
        currentPhase.milestones.push(currentMilestone);
        continue;
      }
      
      // Check for task list item
      const taskMatch = line.match(/^\s*[-*]\s+(.+)/);
      if (taskMatch && currentMilestone) {
        currentMilestone.tasks.push(taskMatch[1]);
      }
    }
    
    // Add the last phase if exists
    if (currentPhase) {
      phases.push(currentPhase);
    }
    
    return { phases };
  }

  parseMarkdown(text) {
    // Basic markdown parsing
    let html = text;
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    
    // Code blocks
    html = html.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Paragraphs
    html = html.split('\n\n').map(para => {
      if (!para.match(/^<[^>]+>/)) {
        return `<p>${para}</p>`;
      }
      return para;
    }).join('\n');
    
    return html;
  }

  async loadPlanMd() {
    try {
      const response = await fetch('/api/file?path=PLAN.md');
      if (!response.ok) {
        return null;
      }
      const text = await response.text();
      return this.parsePlanTasks(text);
    } catch (error) {
      console.error('Failed to load PLAN.md:', error);
      return null;
    }
  }

  parsePlanTasks(text) {
    const tasks = [];
    const lines = text.split('\n');
    let totalCount = 0;
    let completedCount = 0;
    
    for (const line of lines) {
      // Match checkbox pattern: [ ] or [x] or [X]
      const checkboxMatch = line.match(/^\s*\[([xX ])\]\s+(.+)/);
      if (checkboxMatch) {
        const isCompleted = checkboxMatch[1].toLowerCase() === 'x';
        const taskText = checkboxMatch[2];
        
        tasks.push({
          completed: isCompleted,
          text: taskText
        });
        
        totalCount++;
        if (isCompleted) {
          completedCount++;
        }
      }
    }
    
    return {
      tasks,
      totalCount,
      completedCount
    };
  }

  calculateTaskCompletion(tasks) {
    if (tasks.length === 0) {
      return 0;
    }
    
    const completed = tasks.filter(task => task.completed).length;
    const percentage = Math.round((completed / tasks.length) * 100);
    return percentage;
  }

  renderPlanningDocTree() {
    let html = `
      <div class="state-section planning-docs-section">
        <h3>Planning Documents</h3>
        <div class="planning-doc-tree">
    `;
    
    this.planningDocs.forEach(doc => {
      html += `
        <div class="planning-doc-item" data-path="${doc.path}">
          <div class="doc-header">
            <span class="doc-toggle ${doc.expanded ? 'expanded' : ''}" data-doc="${doc.path}">▶</span>
            <span class="doc-name">${doc.name}</span>
            <button class="doc-action-btn open-doc" data-path="${doc.path}" title="Open in editor">📝</button>
          </div>
          <div class="doc-content ${doc.expanded ? 'expanded' : 'collapsed'}" id="doc-content-${doc.path.replace('.', '-')}">
            <div class="doc-loading">Loading...</div>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  }

  renderResumeWorkButton() {
    return `
      <div class="state-section quick-actions-section">
        <h3>Quick Actions</h3>
        <div class="quick-action-buttons">
          <button class="quick-action-btn resume-work-btn" data-path="CONTINUE_HERE.md">
            ▶️ Resume work
          </button>
          <button class="quick-action-btn view-decisions-btn" data-path="DECISIONS.md">
            📋 View decisions
          </button>
          <button class="quick-action-btn progress-summary-btn">
            📊 Progress summary
          </button>
        </div>
      </div>
    `;
  }

  async loadDocumentContent(docPath) {
    const contentId = `doc-content-${docPath.replace('.', '-')}`;
    const contentDiv = document.getElementById(contentId);
    
    if (!contentDiv) return;
    
    try {
      const response = await fetch(`/api/file?path=${encodeURIComponent(docPath)}`);
      if (!response.ok) {
        contentDiv.innerHTML = '<div class="doc-error">Document not found</div>';
        return;
      }
      
      const text = await response.text();
      const preview = this.createDocumentPreview(text, docPath);
      contentDiv.innerHTML = `<div class="doc-preview">${preview}</div>`;
    } catch (error) {
      contentDiv.innerHTML = '<div class="doc-error">Failed to load document</div>';
    }
  }

  createDocumentPreview(text, docPath) {
    const lines = text.split('\n').filter(line => line.trim());
    const maxLines = 5;
    const preview = lines.slice(0, maxLines);
    
    let html = '<ul class="doc-preview-list">';
    
    // For PLAN.md, show task completion summary
    if (docPath === 'PLAN.md') {
      const planData = this.parsePlanTasks(text);
      const percentage = this.calculateTaskCompletion(planData.tasks);
      html += `<li class="task-summary">📊 ${planData.completedCount}/${planData.totalCount} tasks complete (${percentage}%)</li>`;
    }
    
    // For ROADMAP.md, show phase count
    if (docPath === 'ROADMAP.md') {
      const roadmapData = this.parseRoadmapPhases(text);
      const phaseCount = roadmapData.phases.length;
      const milestoneCount = roadmapData.phases.reduce((sum, p) => sum + p.milestones.length, 0);
      html += `<li class="phase-summary">🎯 ${phaseCount} phases, ${milestoneCount} milestones</li>`;
    }
    
    // Show first few lines as preview
    preview.forEach((line, index) => {
      if (index < 3) {
        const truncated = line.length > 60 ? line.substring(0, 60) + '...' : line;
        html += `<li>${this.escapeHtml(truncated)}</li>`;
      }
    });
    
    if (lines.length > maxLines) {
      html += `<li class="more-indicator">... and ${lines.length - maxLines} more lines</li>`;
    }
    
    html += '</ul>';
    return html;
  }

  setupPlanningDocHandlers() {
    // Toggle document expansion
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('doc-toggle')) {
        const docPath = e.target.dataset.doc;
        const docItem = this.planningDocs.find(d => d.path === docPath);
        const contentDiv = document.getElementById(`doc-content-${docPath.replace('.', '-')}`);
        
        if (docItem) {
          docItem.expanded = !docItem.expanded;
          e.target.classList.toggle('expanded');
          contentDiv.classList.toggle('expanded');
          contentDiv.classList.toggle('collapsed');
          
          // Load content if expanding and not already loaded
          if (docItem.expanded && contentDiv.querySelector('.doc-loading')) {
            await this.loadDocumentContent(docPath);
          }
        }
      }
      
      // Open document in editor
      if (e.target.classList.contains('open-doc')) {
        const path = e.target.dataset.path;
        const event = new CustomEvent('open-file', { detail: { path } });
        document.dispatchEvent(event);
      }
      
      // Resume work button
      if (e.target.classList.contains('resume-work-btn')) {
        const path = e.target.dataset.path;
        const event = new CustomEvent('open-file', { detail: { path } });
        document.dispatchEvent(event);
      }
      
      // View decisions button
      if (e.target.classList.contains('view-decisions-btn')) {
        const path = e.target.dataset.path;
        const event = new CustomEvent('open-file', { detail: { path } });
        document.dispatchEvent(event);
      }
      
      // Progress summary button
      if (e.target.classList.contains('progress-summary-btn')) {
        this.showProgressSummary();
      }
    });
  }

  createCircularProgress(percentage, size = 80) {
    const radius = (size - 4) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return `
      <svg width="${size}" height="${size}" class="circular-progress">
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          stroke="#e0e0e0"
          stroke-width="4"
          fill="none"
        />
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          stroke="#4caf50"
          stroke-width="4"
          fill="none"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${strokeDashoffset}"
          stroke-linecap="round"
          transform="rotate(-90 ${size / 2} ${size / 2})"
          class="progress-circle"
        />
        <text
          x="${size / 2}"
          y="${size / 2}"
          text-anchor="middle"
          dominant-baseline="middle"
          class="progress-text"
          font-size="16"
          font-weight="500"
          fill="#333"
        >${percentage}%</text>
      </svg>
    `;
  }

  async generateProgressSummary() {
    const summary = {
      project: null,
      planTasks: null,
      roadmap: null,
      timestamp: new Date().toLocaleString()
    };

    // Get project info
    if (this.projectData) {
      const projectName = this.projectData.match(/^#\s+(.+)$/m);
      summary.project = projectName ? projectName[1] : 'Unknown Project';
    }

    // Get task completion info
    if (this.planData) {
      summary.planTasks = {
        total: this.planData.totalCount,
        completed: this.planData.completedCount,
        percentage: this.calculateTaskCompletion(this.planData.tasks)
      };
    }

    // Get roadmap info
    if (this.roadmapData) {
      summary.roadmap = {
        totalPhases: this.roadmapData.length,
        totalMilestones: this.roadmapData.reduce((sum, phase) => sum + phase.milestones.length, 0),
        totalTasks: this.roadmapData.reduce((sum, phase) => 
          sum + phase.milestones.reduce((mSum, milestone) => mSum + milestone.tasks.length, 0), 0)
      };
    }

    return summary;
  }

  showProgressSummary() {
    this.generateProgressSummary().then(summary => {
      let message = `📊 Project Progress Summary\n`;
      message += `Generated: ${summary.timestamp}\n\n`;
      
      if (summary.project) {
        message += `Project: ${summary.project}\n\n`;
      }
      
      if (summary.planTasks) {
        message += `Task Completion:\n`;
        message += `✅ Completed: ${summary.planTasks.completed} tasks\n`;
        message += `📝 Total: ${summary.planTasks.total} tasks\n`;
        message += `📈 Progress: ${summary.planTasks.percentage}%\n\n`;
      }
      
      if (summary.roadmap) {
        message += `Roadmap Overview:\n`;
        message += `🎯 Phases: ${summary.roadmap.totalPhases}\n`;
        message += `🏁 Milestones: ${summary.roadmap.totalMilestones}\n`;
        message += `📋 Total Tasks: ${summary.roadmap.totalTasks}\n`;
      }
      
      if (!summary.planTasks && !summary.roadmap) {
        message += `No progress data available. Please ensure PROJECT.md, PLAN.md, and ROADMAP.md files exist.`;
      }
      
      alert(message);
    });
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

// CSS styles for state panel
const statePanelStyles = `
<style>
.state-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.state-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.state-panel-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.refresh-btn {
  padding: 5px 10px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.refresh-btn:hover {
  background: #f5f5f5;
}

.state-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.state-loading {
  text-align: center;
  color: #666;
  padding: 40px;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 40px;
}

.empty-state h3 {
  color: #333;
  margin-bottom: 10px;
}

.error-state {
  text-align: center;
  color: #d32f2f;
  padding: 40px;
}

.error-state button {
  margin-top: 15px;
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.state-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.state-section {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 15px;
}

.state-section h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}

.progress-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-label {
  flex: 1;
  font-size: 14px;
  color: #666;
}

.progress-bar {
  width: 150px;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s ease;
}

.progress-value {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  min-width: 50px;
  text-align: right;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activity-list li {
  padding: 5px 0;
  font-size: 14px;
  color: #666;
}

.timestamp {
  color: #999;
  font-size: 12px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.task-item.completed .task-text {
  text-decoration: line-through;
  color: #999;
}

.checkbox {
  font-size: 18px;
}

.section-content {
  font-size: 14px;
  color: #666;
  white-space: pre-wrap;
}

.markdown-content {
  color: #333;
}

.markdown-content h1 {
  font-size: 24px;
  margin: 20px 0 10px 0;
}

.markdown-content h2 {
  font-size: 20px;
  margin: 15px 0 10px 0;
}

.markdown-content h3 {
  font-size: 16px;
  margin: 10px 0 8px 0;
}

.markdown-content p {
  margin: 10px 0;
  line-height: 1.6;
}

.markdown-content ul {
  margin: 10px 0;
  padding-left: 20px;
}

.markdown-content li {
  margin: 5px 0;
}

.markdown-content code {
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.markdown-content pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-content a {
  color: #2196f3;
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

.project-section {
  background: #f9f9f9;
  border: 1px solid #2196f3;
}

.roadmap-section {
  background: #f5f9ff;
  border: 1px solid #64b5f6;
}

.roadmap-phases {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.roadmap-phase {
  border-left: 3px solid #2196f3;
  padding-left: 15px;
}

.phase-name {
  font-size: 15px;
  font-weight: 600;
  color: #1976d2;
  margin: 0 0 10px 0;
}

.phase-milestones {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.roadmap-milestone {
  margin-left: 20px;
  border-left: 2px solid #90caf9;
  padding-left: 12px;
}

.milestone-name {
  font-size: 14px;
  font-weight: 500;
  color: #424242;
  margin: 0 0 8px 0;
}

.milestone-tasks {
  list-style-type: disc;
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #666;
}

.milestone-tasks li {
  margin: 4px 0;
  line-height: 1.5;
}

.plan-section {
  background: #f0fdf4;
  border: 1px solid #4ade80;
}

.task-completion-summary {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.completion-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  min-width: 120px;
}

.progress-bar.large {
  width: 200px;
  height: 24px;
}

.task-stats {
  font-size: 13px;
  color: #666;
  margin-top: 5px;
}

.circular-progress {
  flex-shrink: 0;
}

.progress-circle {
  transition: stroke-dashoffset 0.5s ease;
}

.progress-indicators {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.task-completion-summary {
  display: flex;
  align-items: center;
  gap: 20px;
}

.task-completion-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-completion-details .progress-bar.large {
  width: 100%;
}

.progress-item {
  margin-bottom: 15px;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.planning-docs-section {
  background: #faf5ff;
  border: 1px solid #a855f7;
}

.planning-doc-tree {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.planning-doc-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  overflow: hidden;
}

.doc-header {
  display: flex;
  align-items: center;
  padding: 10px;
  background: #f9f9f9;
  cursor: pointer;
  user-select: none;
}

.doc-toggle {
  font-size: 12px;
  margin-right: 8px;
  transition: transform 0.2s ease;
  color: #666;
}

.doc-toggle.expanded {
  transform: rotate(90deg);
}

.doc-name {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.doc-action-btn {
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 8px;
}

.doc-action-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.doc-content {
  overflow: hidden;
  transition: max-height 0.3s ease;
  border-top: 1px solid #e0e0e0;
}

.doc-content.collapsed {
  max-height: 0;
  border-top: none;
}

.doc-content.expanded {
  max-height: 300px;
  overflow-y: auto;
}

.doc-loading {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.doc-error {
  padding: 20px;
  text-align: center;
  color: #d32f2f;
  font-size: 13px;
}

.doc-preview {
  padding: 15px;
  background: #fafafa;
}

.doc-preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
  color: #666;
}

.doc-preview-list li {
  padding: 4px 0;
  line-height: 1.5;
}

.task-summary, .phase-summary {
  font-weight: 500;
  color: #4caf50;
  margin-bottom: 8px;
}

.phase-summary {
  color: #2196f3;
}

.more-indicator {
  font-style: italic;
  color: #999;
  margin-top: 5px;
}

.quick-actions-section {
  background: #f0f9ff;
  border: 1px solid #0284c7;
}

.quick-action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-action-btn {
  padding: 8px 16px;
  border: none;
  background: #0284c7;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s ease;
}

.quick-action-btn:hover {
  background: #0369a1;
}

.quick-action-btn:active {
  background: #075985;
}

.resume-work-btn {
  background: #059669;
}

.resume-work-btn:hover {
  background: #047857;
}

.resume-work-btn:active {
  background: #065f46;
}

.view-decisions-btn {
  background: #7c3aed;
}

.view-decisions-btn:hover {
  background: #6d28d9;
}

.view-decisions-btn:active {
  background: #5b21b6;
}

.progress-summary-btn {
  background: #f59e0b;
}

.progress-summary-btn:hover {
  background: #d97706;
}

.progress-summary-btn:active {
  background: #b45309;
}
</style>
`;

// Add styles to document if not already added
if (!document.getElementById('state-panel-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'state-panel-styles';
  styleElement.innerHTML = statePanelStyles;
  document.head.appendChild(styleElement);
}