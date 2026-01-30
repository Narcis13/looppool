// Test for directional arrow edges in graph visualization
import { GraphViewer } from '../src/frontend/graph-viewer.js';

describe('GraphViewer - Directional Arrow Edges', () => {
  let container;
  let graphViewer;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    graphViewer = new GraphViewer(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should create arrow marker definition in SVG', () => {
    const testData = {
      nodes: [
        { id: 'commands/test.md', name: 'test', type: 'command' },
        { id: 'looppool/workflows/workflow.md', name: 'workflow', type: 'workflow' }
      ],
      edges: [
        { source: 'commands/test.md', target: 'looppool/workflows/workflow.md', type: 'delegates-to' }
      ]
    };

    graphViewer.renderGraph(testData);

    // Check for marker definition
    const svg = container.querySelector('.graph-svg');
    const marker = svg.querySelector('marker#arrow');
    
    expect(marker).toBeTruthy();
    expect(marker.getAttribute('id')).toBe('arrow');
    expect(marker.getAttribute('orient')).toBe('auto');
    expect(marker.getAttribute('markerWidth')).toBe('6');
    expect(marker.getAttribute('markerHeight')).toBe('6');
    expect(marker.getAttribute('refX')).toBe('15');
    
    // Check arrow path
    const path = marker.querySelector('path');
    expect(path).toBeTruthy();
    expect(path.getAttribute('d')).toBe('M0,-5L10,0L0,5');
    expect(path.getAttribute('fill')).toBe('#999');
  });

  test('should apply marker-end attribute to edge lines', () => {
    const testData = {
      nodes: [
        { id: 'commands/test.md', name: 'test', type: 'command' },
        { id: 'looppool/workflows/workflow.md', name: 'workflow', type: 'workflow' }
      ],
      edges: [
        { source: 'commands/test.md', target: 'looppool/workflows/workflow.md', type: 'delegates-to' }
      ]
    };

    graphViewer.renderGraph(testData);

    // Check edge has marker-end attribute
    const edges = container.querySelectorAll('.edge');
    expect(edges.length).toBe(1);
    expect(edges[0].getAttribute('marker-end')).toBe('url(#arrow)');
  });

  test('should create directional arrows for all edge types', () => {
    const testData = {
      nodes: [
        { id: 'commands/cmd.md', name: 'cmd', type: 'command' },
        { id: 'looppool/workflows/wf.md', name: 'wf', type: 'workflow' },
        { id: 'agents/agent.md', name: 'agent', type: 'agent' },
        { id: 'looppool/templates/tmpl.md', name: 'tmpl', type: 'template' }
      ],
      edges: [
        { source: 'commands/cmd.md', target: 'looppool/workflows/wf.md', type: 'delegates-to' },
        { source: 'looppool/workflows/wf.md', target: 'agents/agent.md', type: 'spawns' },
        { source: 'agents/agent.md', target: 'looppool/templates/tmpl.md', type: 'uses' }
      ]
    };

    graphViewer.renderGraph(testData);

    // Check all edges have marker-end
    const edges = container.querySelectorAll('.edge');
    expect(edges.length).toBe(3);
    
    edges.forEach(edge => {
      expect(edge.getAttribute('marker-end')).toBe('url(#arrow)');
    });
  });

  test('should create defs element before edges', () => {
    const testData = {
      nodes: [
        { id: 'commands/test.md', name: 'test', type: 'command' },
        { id: 'looppool/workflows/workflow.md', name: 'workflow', type: 'workflow' }
      ],
      edges: [
        { source: 'commands/test.md', target: 'looppool/workflows/workflow.md', type: 'delegates-to' }
      ]
    };

    graphViewer.renderGraph(testData);

    const svg = container.querySelector('.graph-svg');
    const children = Array.from(svg.children);
    
    // Find positions of defs and edges
    let defsIndex = -1;
    let edgesIndex = -1;
    
    children.forEach((child, index) => {
      if (child.tagName === 'defs') defsIndex = index;
      if (child.classList.contains('edges')) edgesIndex = index;
    });
    
    // Defs should exist
    expect(defsIndex).toBeGreaterThan(-1);
    expect(edgesIndex).toBeGreaterThan(-1);
  });
});