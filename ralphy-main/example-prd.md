# Example PRD - Task List

This is an example PRD (Product Requirements Document) in Markdown format.
Ralphy will execute each unchecked task sequentially using your chosen AI engine.

## Project Setup

- [ ] Initialize the project with the chosen framework
- [ ] Set up the development environment and install dependencies
- [ ] Configure linting and formatting tools (ESLint, Prettier)

## Core Features

- [ ] Create the main application layout and navigation
- [ ] Implement user authentication (login, signup, logout)
- [ ] Build the dashboard page with key metrics
- [ ] Add data fetching and state management

## Database & API

- [ ] Design and create the database schema
- [ ] Implement API endpoints for CRUD operations
- [ ] Add input validation and error handling

## UI/UX

- [ ] Style components with Tailwind CSS
- [ ] Add loading states and skeleton screens
- [ ] Implement toast notifications for user feedback
- [ ] Ensure responsive design for mobile devices

## Testing & Quality

- [ ] Write unit tests for core functions
- [ ] Add integration tests for API endpoints
- [ ] Test user flows end-to-end

## Deployment

- [ ] Configure environment variables for production
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production environment
- [ ] Verify deployment and run smoke tests

---

## Usage

Run with ralphy:

```bash
# Using default markdown format
ralphy

# Or explicitly specify the file
ralphy --prd example-prd.md
```

## Notes

- Tasks are marked complete automatically when the AI agent finishes them
- Completed tasks show as `- [x] Task description`
- Tasks are executed in order from top to bottom
