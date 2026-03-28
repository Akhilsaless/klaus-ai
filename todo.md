# Klaus AI - Project TODO

## Phase 1: Database & Schema
- [x] Define schema: tasks, steps, outputs, logs, memory, chatMessages tables
- [x] Generate and apply migration SQL

## Phase 2: Backend - Agent Core
- [x] Agent Planner module (breaks goal into steps via LLM)
- [x] Agent Executor module (orchestrates full autonomous loop)
- [x] Tool Manager (web research, code gen, file gen, email gen, data analysis, text writer)
- [x] Memory system (conversation history, task states, context in JSON)
- [x] Verifier module (validates output quality with LLM scoring)
- [x] tRPC router: tasks (create, list, get, delete, getSteps, getOutputs, getLogs)
- [x] tRPC router: chat (getMessages, sendMessage)
- [x] SSE endpoint for real-time step streaming (/api/agent/run/:taskId)
- [x] Status polling endpoint (/api/agent/status/:taskId)

## Phase 3: Frontend - Core Pages
- [x] Global dark-mode theme setup in index.css (OKLCH-based dark palette)
- [x] Landing page with hero, features, how-it-works, and CTA
- [x] AgentChat page (goal input + real-time execution view + steps panel)
- [x] Dashboard page (task history, stats, delete)
- [x] TaskDetail page (outputs, steps, logs tabs + output viewer with copy/download)
- [x] App routing in App.tsx (/, /agent, /dashboard, /task/:id)

## Phase 4: Integration & Polish
- [x] Wire SSE real-time updates to frontend (EventSource via fetch + ReadableStream)
- [x] Live step status updates in right panel
- [x] File download for generated outputs (TXT download)
- [x] Copy to clipboard for outputs
- [x] Mobile responsive layout (all pages)
- [x] Error states and loading states
- [x] Empty states for dashboard and agent chat

## Phase 5: Tests & Delivery
- [x] Vitest unit tests for agent routers (11 tests passing)
- [x] Vitest auth logout test (1 test passing)
- [ ] Save checkpoint
