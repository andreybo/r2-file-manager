# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Development: `yarn dev` (runs on port 9002 with Turbopack)
- Build: `yarn build`
- Start: `yarn start`
- Lint: `yarn lint`
- Type Check: `yarn typecheck` (runs TypeScript without emitting files)

## Code Style
- **Components**: React functional components with TypeScript interfaces
- **Naming**: PascalCase for components/interfaces, camelCase for functions/variables
- **Imports**: Group imports by source (React, UI components, utils, types)
- **Types**:
  - Always define interfaces for component props
  - Use strong typing with React.FC<Props> or React.ReactNode
  - Document complex interfaces with JSDoc comments
- **CSS**: Use Tailwind with clsx/twMerge utility (cn function) for class merging
- **Error Handling**: Use try/catch blocks with meaningful error messages
- **State Management**: Prefer React hooks (useState, useEffect) for local state
- **File Organization**: Follow Next.js app directory structure
- **TypeScript**: Strict mode enabled, use paths alias (@/*) for imports