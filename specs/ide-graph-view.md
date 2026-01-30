# Graph View

Visualize relationships between commands, workflows, agents, and templates.

## Overview

Interactive graph showing how components connect. Commands delegate to workflows, workflows spawn agents, agents use templates.

## Requirements

### Graph Display
- Nodes: Commands (blue), Workflows (green), Agents (orange), Templates (gray)
- Edges: Show delegation/spawning relationships
- Click node to open in editor

### Interaction
- Zoom and pan
- Click node to highlight connections
- Double-click to open file
- Filter by component type

### Layout
- Hierarchical layout: Commands → Workflows → Agents → Templates
- Auto-arrange to minimize crossing edges

## Technology
- Use lightweight library (d3-force or cytoscape.js)
- SVG-based for crisp rendering

## Acceptance Criteria

- [ ] All commands, workflows, agents rendered as nodes
- [ ] Relationships shown as edges
- [ ] Can navigate to any component by clicking
- [ ] Graph is readable with 50+ nodes
