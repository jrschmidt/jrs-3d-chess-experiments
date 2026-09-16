# Project Guide: Monolith to Vite Migration

## Environment & Build System
- **Build Tool:** Vite (Vanilla TS configuration)
- **Module System:** Native ES Modules (ESM) using explicit `import` and `export`
- **Package Manager:** npm

## Refactoring Strategy & Architecture
We are splitting a single 800-line monolithic JavaScript file into 7–8 clean, isolated modules. Follow a strict **bottom-up approach**:
1. **Utility Level:** Move independent, pure functions first (zero internal dependencies).
2. **State/Data Level:** Isolate shared state, storage, and API logic.
3. **UI/Component Level:** Move DOM manipulation and event listeners last.

### Directory Structure Requirements
Ensure all new files follow this layout:
- `src/utils/` - Pure helper functions (math, formatting, validation).
- `src/api/` - Fetch requests and API interactions.
- `src/state/` - App state, reactive storage, and state-modifier functions.
- `src/components/` - UI rendering, DOM setup, and layout handling.
- `src/main.ts` - Minimal application entry point and bootstrapper.

## Code Style & Conventions
- **Exports:** Always use **Named Exports** (`export function myFunc() {}`). Avoid `export default`.
- **Imports:** Always include file extensions for local modules if required by Vite (e.g., `import { helper } from './utils/math.ts'`).
- **DOM Access:** Avoid global DOM selections inside utility modules. Pass target elements or data context as arguments.
- **State Mutation:** Never mutate state variables directly from components; use explicit setter functions exported from the state module.

## Useful Commands
- Start dev server: `npm run dev`
- Build project: `npm run build`
- Preview production build: `npm run preview`
