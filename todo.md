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
- [x] Save checkpoint

## Fix: Claude API Integration (Run Agent)
- [x] Diagnose root cause of "Failed to start task" error
- [x] Install @anthropic-ai/sdk package
- [x] Add ANTHROPIC_API_KEY environment variable
- [x] Create POST /api/run-task endpoint with full validation
- [x] Wire agent planner/executor/verifier to Claude via Anthropic SDK
- [x] Fix frontend AgentChat to call /api/run-task correctly
- [x] Add loading state, disable button during submission
- [x] Show real backend error messages on frontend
- [x] Show result in clean response panel
- [x] Remove Ctrl+Enter hint on mobile
- [x] Fix floating footer not covering UI
- [x] Add detailed backend logging for all failure modes
- [x] Test with "Write a hello world Python script"
- [x] Test with "Create a lead generation plan for accommodation businesses in Hyderabad"

## Upgrade: Real Agent System
- [x] Complete Claude executor + verifier using Anthropic SDK
- [x] Real WebScraperTool using axios + cheerio
- [x] Real CodeExecutionTool using child_process sandbox
- [x] Real FileGeneratorTool with download URLs
- [x] DataProcessorTool for data cleaning/formatting
- [x] POST /api/run-task endpoint with full agent flow
- [x] Rate limiting on /api/run-task
- [x] Persistent task history (tasks table fully wired)
- [x] Frontend: Run Agent calls /api/run-task
- [x] Frontend: loading state + disabled button during run
- [x] Frontend: real error messages from backend
- [x] Frontend: result panel with markdown rendering
- [x] Frontend: file download buttons
- [x] Frontend: remove Ctrl+Enter hint on mobile
- [x] Backend: never expose API key to client
- [x] Backend: input validation on all endpoints
- [x] Backend: detailed error logging

## Fix: Claude Model 404 Error
- [x] Replace invalid model "claude-3-5-haiku-20241022" with "claude-3-5-sonnet-latest"
- [x] Add fallback model "claude-3-haiku-20240307" on 404/model_not_found errors
- [x] Log model errors clearly with model name and status code
- [x] Verify all agent modules route through claude.ts (no hardcoded models elsewhere)
- [x] Run all 31 tests and confirm they pass
- [x] Save checkpoint
