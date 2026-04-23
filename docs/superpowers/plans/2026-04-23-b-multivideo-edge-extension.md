# Edge MultiVideo Side Panel Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Edge MV3 extension that lets users paste multiple video links, review them in a pending list, and run up to six tasks through either inline side-panel playback or background webpage control with automatic recovery.

**Architecture:** Use a React side panel for UI, a service-worker orchestrator for task state and scheduling, and a dual-path execution model: direct media links render inside the side panel, while webpage links run in inactive tabs controlled by a content-script adapter layer. Persist task state in `chrome.storage.local` so the extension can restore running tasks after side-panel close or browser restart.

**Tech Stack:** TypeScript, React, Vite, Edge MV3 APIs, `hls.js`, Vitest, Testing Library, Playwright

---

## Execution Strategy

- Use fresh worker subagents for implementation tasks.
- Every worker must follow `superpowers:test-driven-development`:
  - write the failing test first
  - run the targeted test and verify the expected red failure
  - write the minimal implementation
  - rerun the targeted test and keep the suite green
- Parallelize only tasks with disjoint write scopes.

### Parallel Batches

1. **Serial foundation**
   - Task 0
   - Task 1
   - Task 2
2. **Batch A: safe parallel lanes after shared contracts exist**
   - Task 3
   - Task 4
   - Task 6
3. **Serial integration gate**
   - Task 5 after Tasks 3 and 4 finish
4. **Batch B: media execution lanes**
   - Task 7 after Task 6 finishes
   - Task 8 after Task 4 finishes
5. **Serial integration and finish**
   - Task 9 after Tasks 5, 7, and 8 finish
   - Task 10 after Task 9 finishes

If any batch returns overlapping write scopes during execution, stop parallel work for that batch and re-sequence it.

## Planned File Structure

- `.gitignore`
  - Ignore `node_modules`, `dist`, Playwright output, and `.omx`.
- `package.json`
  - Scripts and dependencies for build, unit test, and manual fixture serving.
- `tsconfig.json`
  - Shared TypeScript compiler settings for extension code.
- `vite.config.ts`
  - Build `sidepanel.html`, `service-worker.js`, and `content-runner.js` into stable output paths.
- `vitest.config.ts`
  - Unit test setup with `jsdom`.
- `playwright.config.ts`
  - Browser automation for manual fixture validation.
- `public/manifest.json`
  - Edge MV3 manifest, permissions, host permissions, background worker, side panel, and content script entries.
- `src/shared/contracts.ts`
  - Cross-context domain types for tasks, task state, and resolver output.
- `src/shared/messages.ts`
  - Runtime message contracts between side panel, service worker, and content script.
- `src/shared/url.ts`
  - Link parsing and direct-media detection helpers.
- `src/shared/task-factory.ts`
  - Convert pasted text into draft task records.
- `src/background/persistence.ts`
  - Read/write storage snapshots from `chrome.storage.local`.
- `src/background/task-store.ts`
  - In-memory task state container with persistence hooks.
- `src/background/resolver.ts`
  - Choose `inline` versus `background` execution mode.
- `src/background/scheduler.ts`
  - Enforce the six-task concurrency cap.
- `src/background/hidden-page-manager.ts`
  - Create and track inactive tabs for webpage-backed tasks.
- `src/background/orchestrator.ts`
  - Core task lifecycle manager and message handlers.
- `src/background/service-worker.ts`
  - Wire browser events to the orchestrator.
- `src/content/adapters/types.ts`
  - Adapter contract for webpage control.
- `src/content/adapters/html5.ts`
  - Default HTML5 `<video>` adapter.
- `src/content/adapters/registry.ts`
  - Pick the best adapter for a page.
- `src/content/runner.ts`
  - Content script bridge that connects page adapters to the background worker.
- `src/sidepanel/index.html`
  - Side-panel HTML entry.
- `src/sidepanel/main.tsx`
  - React bootstrap.
- `src/sidepanel/App.tsx`
  - High-level side-panel layout.
- `src/sidepanel/app.css`
  - Focused styling for the three-panel layout.
- `src/sidepanel/state/useTaskBridge.ts`
  - Runtime messaging bridge between UI and orchestrator.
- `src/sidepanel/components/PasteForm.tsx`
  - Multiline paste input and submit controls.
- `src/sidepanel/components/DraftTaskList.tsx`
  - Pending task list UI.
- `src/sidepanel/components/InlineTaskCard.tsx`
  - Side-panel card for direct media playback.
- `src/sidepanel/components/BackgroundTaskCard.tsx`
  - Side-panel card for webpage-backed tasks.
- `src/sidepanel/components/StatusBadge.tsx`
  - Shared status rendering.
- `src/sidepanel/lib/createInlineController.ts`
  - Media-element and `hls.js` glue for inline playback.
- `tests/unit/shared/*.test.ts`
  - Pure helper tests.
- `tests/unit/background/*.test.ts`
  - Resolver, scheduler, store, and recovery tests.
- `tests/unit/content/*.test.ts`
  - Adapter tests.
- `tests/unit/sidepanel/*.test.tsx`
  - UI tests for paste flow and task cards.
- `scripts/fixture-server.mjs`
  - Local server for manual playback fixtures.
- `tests/fixtures/*.html`
  - Static pages for direct-link and webpage-link validation.
- `README.md`
  - Setup, load-in-Edge, and QA instructions.

### Task 0: Create A Dedicated Worktree

**Files:**
- Create: none
- Modify: none
- Test: none

- [ ] **Step 1: Create a dedicated worktree for implementation**

```powershell
git worktree add ..\chaoxing-shuake-b -b feat\b-multivideo-sidepanel
```

Expected: Git prints a new branch name and creates `..\chaoxing-shuake-b`.

- [ ] **Step 2: Enter the worktree and verify the branch**

```powershell
Set-Location ..\chaoxing-shuake-b
git branch --show-current
```

Expected: `feat/b-multivideo-sidepanel`

- [ ] **Step 3: Confirm the spec and plan are present before touching code**

```powershell
Test-Path docs\superpowers\specs\2026-04-23-b-multivideo-edge-extension-design.md
Test-Path docs\superpowers\plans\2026-04-23-b-multivideo-edge-extension.md
```

Expected: both commands print `True`.

### Task 1: Bootstrap The Extension Workspace

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `public/manifest.json`
- Create: `src/sidepanel/index.html`
- Create: `src/sidepanel/main.tsx`
- Create: `src/sidepanel/App.tsx`
- Create: `src/background/service-worker.ts`
- Create: `src/content/runner.ts`
- Create: `tests/unit/smoke.test.ts`

- [ ] **Step 1: Create the base workspace files**

```gitignore
node_modules/
dist/
playwright-report/
test-results/
.omx/
```

```json
{
  "name": "multivideo-sidepanel-extension",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "fixtures": "node scripts/fixture-server.mjs"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.53.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@types/chrome": "^0.1.29",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.1",
    "jsdom": "^26.1.0",
    "typescript": "^5.8.3",
    "vite": "^6.3.5",
    "vitest": "^3.1.4"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "types": ["chrome", "vitest/globals"],
    "baseUrl": "."
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        sidepanel: "src/sidepanel/index.html",
        "service-worker": "src/background/service-worker.ts",
        "content-runner": "src/content/runner.ts"
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "service-worker") return "service-worker.js";
          if (chunk.name === "content-runner") return "content-runner.js";
          return "assets/[name].js";
        },
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
```

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: [],
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"]
  }
});
```

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    headless: true
  }
});
```

```json
{
  "manifest_version": 3,
  "name": "MultiVideo Side Panel",
  "version": "0.1.0",
  "description": "Manage and play up to six video tasks from the Edge side panel.",
  "permissions": ["storage", "tabs", "scripting", "sidePanel"],
  "host_permissions": ["http://*/*", "https://*/*"],
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "content_scripts": [
    {
      "matches": ["http://*/*", "https://*/*"],
      "js": ["content-runner.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_title": "MultiVideo Side Panel"
  }
}
```

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MultiVideo Side Panel</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```tsx
export function App() {
  return <main>MultiVideo Side Panel</main>;
}
```

```ts
chrome.runtime.onInstalled.addListener(() => {
  console.log("service worker ready");
});
```

```ts
console.log("content runner loaded");
```

```ts
import { describe, expect, it } from "vitest";

describe("workspace smoke test", () => {
  it("runs the unit test harness", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and `added ... packages` appears without errors.

- [ ] **Step 3: Run the smoke test**

Run: `npm run test`

Expected: PASS for `tests/unit/smoke.test.ts`.

- [ ] **Step 4: Run the first build**

Run: `npm run build`

Expected: `dist/manifest.json`, `dist/service-worker.js`, `dist/content-runner.js`, and `dist/sidepanel.html` exist.

- [ ] **Step 5: Commit**

```powershell
@'
Create the extension scaffold needed for iterative feature work

This adds the initial Edge MV3 build and test skeleton so later tasks can land in small, verifiable increments.

Constraint: The repository started empty and needed a repeatable build before feature code
Rejected: Plain JavaScript bootstrap | weak type safety across extension contexts
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep the output filenames stable because the manifest refers to them directly
Tested: npm run test; npm run build
Not-tested: Manual extension load in Edge
'@ | Set-Content .git\COMMIT_MSG
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts public/manifest.json src/sidepanel/index.html src/sidepanel/main.tsx src/sidepanel/App.tsx src/background/service-worker.ts src/content/runner.ts tests/unit/smoke.test.ts
git commit -F .git\COMMIT_MSG
```

### Task 2: Define Shared Task Contracts And Link Parsing

**Files:**
- Create: `src/shared/contracts.ts`
- Create: `src/shared/messages.ts`
- Create: `src/shared/url.ts`
- Create: `src/shared/task-factory.ts`
- Test: `tests/unit/shared/url.test.ts`
- Test: `tests/unit/shared/task-factory.test.ts`

- [ ] **Step 1: Write failing tests for link classification and task creation**

```ts
import { describe, expect, it } from "vitest";
import { createDraftTasks } from "../../../src/shared/task-factory";
import { classifyUrl } from "../../../src/shared/url";

describe("classifyUrl", () => {
  it("marks direct media links as inline candidates", () => {
    expect(classifyUrl("https://cdn.example.com/a/video.mp4")).toMatchObject({
      kind: "direct-media",
      directMediaType: "mp4"
    });
  });

  it("marks webpage links as webpage candidates", () => {
    expect(classifyUrl("https://example.com/watch?id=7")).toMatchObject({
      kind: "webpage"
    });
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { createDraftTasks } from "../../../src/shared/task-factory";

describe("createDraftTasks", () => {
  it("splits pasted lines, trims whitespace, and drops duplicates", () => {
    const tasks = createDraftTasks(" https://a.test/v.mp4 \n\nhttps://a.test/v.mp4\nhttps://b.test/page ");

    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.sourceUrl)).toEqual([
      "https://a.test/v.mp4",
      "https://b.test/page"
    ]);
    expect(tasks.every((task) => task.state === "draft")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm run test -- tests/unit/shared/url.test.ts tests/unit/shared/task-factory.test.ts`

Expected: FAIL with missing module or missing export errors.

- [ ] **Step 3: Implement the shared domain files**

```ts
export type TaskState =
  | "draft"
  | "queued"
  | "resolving"
  | "ready_inline"
  | "ready_background"
  | "starting"
  | "playing_inline"
  | "playing_background"
  | "paused"
  | "stopped"
  | "error"
  | "unsupported";

export type ExecutionMode = "inline" | "background";

export interface TaskRecord {
  id: string;
  sourceUrl: string;
  title: string;
  domain: string;
  state: TaskState;
  requestedMode: ExecutionMode | null;
  effectiveMode: ExecutionMode | null;
  directMediaType: "mp4" | "webm" | "m3u8" | null;
  muted: boolean;
  volume: number;
  rate: number;
  errorMessage: string | null;
  tabId: number | null;
  lastHeartbeatAt: number | null;
  createdAt: number;
  updatedAt: number;
  restoreAttempts: number;
}
```

```ts
import type { TaskRecord } from "./contracts";

export interface SidePanelSnapshot {
  tasks: TaskRecord[];
}

export interface RuntimeCommandMessage {
  type:
    | "tasks/add"
    | "tasks/start"
    | "tasks/pause"
    | "tasks/stop"
    | "tasks/delete"
    | "tasks/set-audio"
    | "tasks/snapshot-request";
  payload?: unknown;
}
```

```ts
const directMediaMatchers = [
  { pattern: /\.mp4($|\?)/i, mediaType: "mp4" as const },
  { pattern: /\.webm($|\?)/i, mediaType: "webm" as const },
  { pattern: /\.m3u8($|\?)/i, mediaType: "m3u8" as const }
];

export function classifyUrl(input: string) {
  const url = new URL(input);
  const direct = directMediaMatchers.find(({ pattern }) => pattern.test(url.href));

  return direct
    ? { kind: "direct-media" as const, directMediaType: direct.mediaType, domain: url.hostname }
    : { kind: "webpage" as const, directMediaType: null, domain: url.hostname };
}
```

```ts
import { classifyUrl } from "./url";
import type { TaskRecord } from "./contracts";

export function createDraftTasks(pastedText: string): TaskRecord[] {
  const seen = new Set<string>();
  const now = Date.now();

  return pastedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .map((line, index) => {
      const classification = classifyUrl(line);
      return {
        id: `${now}-${index}`,
        sourceUrl: line,
        title: classification.domain,
        domain: classification.domain,
        state: "draft",
        requestedMode: null,
        effectiveMode: null,
        directMediaType: classification.directMediaType,
        muted: true,
        volume: 1,
        rate: 1,
        errorMessage: null,
        tabId: null,
        lastHeartbeatAt: null,
        createdAt: now,
        updatedAt: now,
        restoreAttempts: 0
      } satisfies TaskRecord;
    });
}
```

- [ ] **Step 4: Run the shared tests again**

Run: `npm run test -- tests/unit/shared/url.test.ts tests/unit/shared/task-factory.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
@'
Record the shared task contracts before wiring extension contexts

This defines the task state model, message contracts, and paste parsing helpers that every extension context will share.

Constraint: Side panel, service worker, and content scripts must agree on task shape
Rejected: Implicit object shapes spread through the codebase | too easy to drift across contexts
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Extend task state by editing the shared union first, then update all switches
Tested: npm run test -- tests/unit/shared/url.test.ts tests/unit/shared/task-factory.test.ts
Not-tested: Integration with browser APIs
'@ | Set-Content .git\COMMIT_MSG
git add src/shared/contracts.ts src/shared/messages.ts src/shared/url.ts src/shared/task-factory.ts tests/unit/shared/url.test.ts tests/unit/shared/task-factory.test.ts
git commit -F .git\COMMIT_MSG
```

### Task 3: Add Persistence And An In-Memory Task Store

**Files:**
- Create: `src/background/persistence.ts`
- Create: `src/background/task-store.ts`
- Test: `tests/unit/background/task-store.test.ts`

- [ ] **Step 1: Write the failing task-store tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTaskStore } from "../../../src/background/task-store";
import type { TaskRecord } from "../../../src/shared/contracts";

const sampleTask = {
  id: "1",
  sourceUrl: "https://cdn.test/clip.mp4",
  title: "cdn.test",
  domain: "cdn.test",
  state: "draft",
  requestedMode: null,
  effectiveMode: null,
  directMediaType: "mp4",
  muted: true,
  volume: 1,
  rate: 1,
  errorMessage: null,
  tabId: null,
  lastHeartbeatAt: null,
  createdAt: 1,
  updatedAt: 1,
  restoreAttempts: 0
} satisfies TaskRecord;

describe("task store", () => {
  it("hydrates and persists task snapshots", async () => {
    const storage = {
      load: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined)
    };
    const store = createTaskStore(storage);

    await store.addMany([sampleTask]);

    expect(store.getSnapshot()).toHaveLength(1);
    expect(storage.save).toHaveBeenCalledWith([sampleTask]);
  });
});
```

- [ ] **Step 2: Run the store test to verify it fails**

Run: `npm run test -- tests/unit/background/task-store.test.ts`

Expected: FAIL with missing module errors.

- [ ] **Step 3: Implement persistence and store**

```ts
import type { TaskRecord } from "../shared/contracts";

const STORAGE_KEY = "multivideo.tasks";

export async function loadTasks(): Promise<TaskRecord[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as TaskRecord[] | undefined) ?? [];
}

export async function saveTasks(tasks: TaskRecord[]) {
  await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
}
```

```ts
import type { TaskRecord } from "../shared/contracts";

interface StorageAdapter {
  load(): Promise<TaskRecord[]>;
  save(tasks: TaskRecord[]): Promise<void>;
}

export function createTaskStore(storage: StorageAdapter) {
  let tasks: TaskRecord[] = [];

  return {
    async hydrate() {
      tasks = await storage.load();
      return tasks;
    },
    getSnapshot() {
      return [...tasks];
    },
    async addMany(nextTasks: TaskRecord[]) {
      tasks = [...tasks, ...nextTasks];
      await storage.save(tasks);
    },
    async update(taskId: string, patch: Partial<TaskRecord>) {
      tasks = tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch, updatedAt: Date.now() } : task
      );
      await storage.save(tasks);
    },
    async replaceAll(nextTasks: TaskRecord[]) {
      tasks = [...nextTasks];
      await storage.save(tasks);
    }
  };
}
```

- [ ] **Step 4: Run the store test again**

Run: `npm run test -- tests/unit/background/task-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
@'
Persist task snapshots before runtime orchestration lands

This adds the storage adapter and in-memory store so the extension can keep task state consistent across restarts.

Constraint: Automatic recovery requires a single persistence path for all task changes
Rejected: Direct chrome.storage writes inside UI components | would fracture state ownership
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Do not bypass the task store when mutating task records
Tested: npm run test -- tests/unit/background/task-store.test.ts
Not-tested: Browser restart recovery
'@ | Set-Content .git\COMMIT_MSG
git add src/background/persistence.ts src/background/task-store.ts tests/unit/background/task-store.test.ts
git commit -F .git\COMMIT_MSG
```

### Task 4: Implement Resolver And Six-Slot Scheduling

**Files:**
- Create: `src/background/resolver.ts`
- Create: `src/background/scheduler.ts`
- Test: `tests/unit/background/resolver.test.ts`
- Test: `tests/unit/background/scheduler.test.ts`

- [ ] **Step 1: Write failing tests for resolver choice and slot limits**

```ts
import { describe, expect, it } from "vitest";
import { resolveTask } from "../../../src/background/resolver";

describe("resolveTask", () => {
  it("uses inline mode for direct media", async () => {
    const result = await resolveTask({
      sourceUrl: "https://cdn.test/movie.m3u8",
      directMediaType: "m3u8"
    });

    expect(result).toMatchObject({
      effectiveMode: "inline",
      state: "ready_inline"
    });
  });

  it("uses background mode for webpage links", async () => {
    const result = await resolveTask({
      sourceUrl: "https://site.test/watch/3",
      directMediaType: null
    });

    expect(result).toMatchObject({
      effectiveMode: "background",
      state: "ready_background"
    });
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { createScheduler } from "../../../src/background/scheduler";

describe("scheduler", () => {
  it("allows only six active task ids", () => {
    const scheduler = createScheduler(6);

    ["1", "2", "3", "4", "5", "6", "7"].forEach((id) => scheduler.enqueue(id));

    expect(scheduler.claimNextBatch()).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(scheduler.claimNextBatch()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm run test -- tests/unit/background/resolver.test.ts tests/unit/background/scheduler.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement resolver and scheduler**

```ts
export async function resolveTask(task: {
  sourceUrl: string;
  directMediaType: "mp4" | "webm" | "m3u8" | null;
}) {
  if (task.directMediaType) {
    return {
      effectiveMode: "inline" as const,
      state: "ready_inline" as const,
      mediaUrl: task.sourceUrl
    };
  }

  return {
    effectiveMode: "background" as const,
    state: "ready_background" as const,
    mediaUrl: null
  };
}
```

```ts
export function createScheduler(limit: number) {
  const queue: string[] = [];
  const active = new Set<string>();

  return {
    enqueue(taskId: string) {
      if (!queue.includes(taskId) && !active.has(taskId)) {
        queue.push(taskId);
      }
    },
    claimNextBatch() {
      const claimed: string[] = [];
      while (active.size < limit && queue.length > 0) {
        const next = queue.shift()!;
        active.add(next);
        claimed.push(next);
      }
      return claimed;
    },
    release(taskId: string) {
      active.delete(taskId);
    },
    getActiveIds() {
      return [...active];
    }
  };
}
```

- [ ] **Step 4: Run the resolver and scheduler tests again**

Run: `npm run test -- tests/unit/background/resolver.test.ts tests/unit/background/scheduler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
@'
Fix the runtime decision points before wiring browser APIs

This adds task resolution and the six-slot scheduler so later orchestration code can choose a run path and enforce concurrency.

Constraint: The first release must cap active work at six tasks
Rejected: Embedding the slot limit inside UI code | the side panel can close while tasks keep running
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep the scheduler pure so unit tests can verify queue behavior without browser mocks
Tested: npm run test -- tests/unit/background/resolver.test.ts tests/unit/background/scheduler.test.ts
Not-tested: Real tab creation and teardown
'@ | Set-Content .git\COMMIT_MSG
git add src/background/resolver.ts src/background/scheduler.ts tests/unit/background/resolver.test.ts tests/unit/background/scheduler.test.ts
git commit -F .git\COMMIT_MSG
```

### Task 5: Build The Background Orchestrator And Message Bus

**Files:**
- Create: `src/background/orchestrator.ts`
- Modify: `src/background/service-worker.ts`
- Test: `tests/unit/background/orchestrator.test.ts`

- [ ] **Step 1: Write failing orchestrator tests for add/start/pause behavior**

```ts
import { describe, expect, it, vi } from "vitest";
import { createOrchestrator } from "../../../src/background/orchestrator";

describe("orchestrator", () => {
  it("adds draft tasks and starts them through the scheduler", async () => {
    const store = {
      addMany: vi.fn(),
      update: vi.fn(),
      getSnapshot: vi.fn().mockReturnValue([
        { id: "1", sourceUrl: "https://cdn.test/v.mp4", directMediaType: "mp4" }
      ])
    };
    const scheduler = {
      enqueue: vi.fn(),
      claimNextBatch: vi.fn().mockReturnValue(["1"])
    };
    const resolver = vi.fn().mockResolvedValue({
      effectiveMode: "inline",
      state: "ready_inline",
      mediaUrl: "https://cdn.test/v.mp4"
    });

    const orchestrator = createOrchestrator({ store, scheduler, resolver });
    await orchestrator.startTasks(["1"]);

    expect(scheduler.enqueue).toHaveBeenCalledWith("1");
    expect(store.update).toHaveBeenCalledWith("1", expect.objectContaining({ state: "starting" }));
  });
});
```

- [ ] **Step 2: Run the orchestrator test to verify it fails**

Run: `npm run test -- tests/unit/background/orchestrator.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the orchestrator and wire the service worker**

```ts
export function createOrchestrator(deps: {
  store: {
    addMany(tasks: unknown[]): Promise<void>;
    update(taskId: string, patch: Record<string, unknown>): Promise<void>;
    getSnapshot(): Array<{ id: string; sourceUrl: string; directMediaType: "mp4" | "webm" | "m3u8" | null }>;
  };
  scheduler: {
    enqueue(taskId: string): void;
    claimNextBatch(): string[];
    release(taskId: string): void;
  };
  resolver: (task: { sourceUrl: string; directMediaType: "mp4" | "webm" | "m3u8" | null }) => Promise<{
    effectiveMode: "inline" | "background";
    state: "ready_inline" | "ready_background";
    mediaUrl: string | null;
  }>;
}) {
  return {
    async startTasks(taskIds: string[]) {
      for (const taskId of taskIds) {
        deps.scheduler.enqueue(taskId);
      }

      const claimed = deps.scheduler.claimNextBatch();
      for (const taskId of claimed) {
        const task = deps.store.getSnapshot().find((item) => item.id === taskId);
        if (!task) continue;

        await deps.store.update(taskId, { state: "starting" });
        const resolved = await deps.resolver(task);
        await deps.store.update(taskId, {
          state: resolved.state,
          effectiveMode: resolved.effectiveMode
        });
      }
    }
  };
}
```

```ts
import { createOrchestrator } from "./orchestrator";
import { loadTasks, saveTasks } from "./persistence";
import { createTaskStore } from "./task-store";
import { createScheduler } from "./scheduler";
import { resolveTask } from "./resolver";

const store = createTaskStore({ load: loadTasks, save: saveTasks });
const scheduler = createScheduler(6);
const orchestrator = createOrchestrator({ store, scheduler, resolver: resolveTask });

chrome.runtime.onInstalled.addListener(async () => {
  await store.hydrate();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "tasks/start") {
    orchestrator.startTasks(message.payload.taskIds).then(() => sendResponse({ ok: true }));
    return true;
  }
});
```

- [ ] **Step 4: Run the orchestrator test**

Run: `npm run test -- tests/unit/background/orchestrator.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
@'
Add the orchestrator that owns task lifecycle transitions

This makes the service worker the single owner of task start flow and scheduling decisions.

Constraint: Tasks must continue running when the side panel closes
Rejected: Letting the UI drive state transitions directly | it would break background continuity
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep browser event handlers thin and push lifecycle logic into the orchestrator
Tested: npm run test -- tests/unit/background/orchestrator.test.ts
Not-tested: Live runtime messaging from the side panel
'@ | Set-Content .git\COMMIT_MSG
git add src/background/orchestrator.ts src/background/service-worker.ts tests/unit/background/orchestrator.test.ts
git commit -F .git\COMMIT_MSG
```

### Task 6: Build The Side Panel Paste Flow And Pending List

**Files:**
- Modify: `src/sidepanel/App.tsx`
- Create: `src/sidepanel/app.css`
- Create: `src/sidepanel/state/useTaskBridge.ts`
- Create: `src/sidepanel/components/PasteForm.tsx`
- Create: `src/sidepanel/components/DraftTaskList.tsx`
- Test: `tests/unit/sidepanel/paste-form.test.tsx`

- [ ] **Step 1: Write a failing UI test for multiline paste**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasteForm } from "../../../src/sidepanel/components/PasteForm";

describe("PasteForm", () => {
  it("submits multiline pasted input", () => {
    const onSubmit = vi.fn();
    render(<PasteForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/video links/i), {
      target: { value: "https://a.test/v.mp4\nhttps://b.test/page" }
    });
    fireEvent.click(screen.getByRole("button", { name: /add to pending list/i }));

    expect(onSubmit).toHaveBeenCalledWith("https://a.test/v.mp4\nhttps://b.test/page");
  });
});
```

- [ ] **Step 2: Run the UI test to verify it fails**

Run: `npm run test -- tests/unit/sidepanel/paste-form.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement the side panel shell**

```tsx
import { useState } from "react";

export function PasteForm({ onSubmit }: { onSubmit(text: string): void }) {
  const [value, setValue] = useState("");

  return (
    <section>
      <label htmlFor="paste-input">Video links</label>
      <textarea
        id="paste-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={6}
      />
      <button
        type="button"
        onClick={() => {
          onSubmit(value);
          setValue("");
        }}
      >
        Add to pending list
      </button>
    </section>
  );
}
```

```tsx
import type { TaskRecord } from "../../shared/contracts";

export function DraftTaskList({
  tasks,
  onStart
}: {
  tasks: TaskRecord[];
  onStart(taskId: string): void;
}) {
  return (
    <section>
      <h2>Pending</h2>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <strong>{task.domain}</strong>
            <span>{task.sourceUrl}</span>
            <button type="button" onClick={() => onStart(task.id)}>
              Start
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```ts
import { useEffect, useState } from "react";
import type { TaskRecord } from "../../shared/contracts";
import { createDraftTasks } from "../../shared/task-factory";

export function useTaskBridge() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "tasks/snapshot-request" }, (response) => {
      setTasks(response.tasks);
    });
  }, []);

  return {
    tasks,
    async addDrafts(pastedText: string) {
      const drafts = createDraftTasks(pastedText);
      await chrome.runtime.sendMessage({ type: "tasks/add", payload: { tasks: drafts } });
      setTasks((current) => [...current, ...drafts]);
    },
    async startTask(taskId: string) {
      await chrome.runtime.sendMessage({ type: "tasks/start", payload: { taskIds: [taskId] } });
    }
  };
}
```

```tsx
import { DraftTaskList } from "./components/DraftTaskList";
import { PasteForm } from "./components/PasteForm";
import { useTaskBridge } from "./state/useTaskBridge";
import "./app.css";

export function App() {
  const { tasks, addDrafts, startTask } = useTaskBridge();
  const draftTasks = tasks.filter((task) => task.state === "draft" || task.state === "queued");

  return (
    <main className="app-shell">
      <h1>MultiVideo Side Panel</h1>
      <PasteForm onSubmit={addDrafts} />
      <DraftTaskList tasks={draftTasks} onStart={startTask} />
    </main>
  );
}
```

```css
body {
  margin: 0;
  font-family: "Segoe UI", sans-serif;
  background: #f4f6fb;
  color: #14213d;
}

.app-shell {
  padding: 16px;
  display: grid;
  gap: 16px;
}

textarea {
  width: 100%;
  min-height: 120px;
}
```

- [ ] **Step 4: Run the paste-form test again**

Run: `npm run test -- tests/unit/sidepanel/paste-form.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
@'
Render the pending-list workflow in the side panel

This adds the multiline paste form, draft task list, and the runtime bridge needed to move tasks from text input into extension state.

Constraint: Users must review tasks before starting them
Rejected: Auto-start on paste | contradicts the approved pending-list workflow
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep side-panel state derived from the orchestrator snapshot rather than inventing a second source of truth
Tested: npm run test -- tests/unit/sidepanel/paste-form.test.tsx
Not-tested: End-to-end runtime messaging in Edge
'@ | Set-Content .git\COMMIT_MSG
git add src/sidepanel/App.tsx src/sidepanel/app.css src/sidepanel/state/useTaskBridge.ts src/sidepanel/components/PasteForm.tsx src/sidepanel/components/DraftTaskList.tsx tests/unit/sidepanel/paste-form.test.tsx
git commit -F .git\COMMIT_MSG
```

### Task 7: Add Inline Playback Cards For Direct Media

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/sidepanel/lib/createInlineController.ts`
- Create: `src/sidepanel/components/InlineTaskCard.tsx`
- Test: `tests/unit/sidepanel/inline-controller.test.ts`

- [ ] **Step 1: Write a failing controller test for direct media and HLS**

```ts
import { describe, expect, it, vi } from "vitest";
import { createInlineController } from "../../../src/sidepanel/lib/createInlineController";

describe("createInlineController", () => {
  it("sets native src for mp4 playback", () => {
    const video = document.createElement("video");
    const controller = createInlineController(video);

    controller.attach("https://cdn.test/movie.mp4", "mp4");
    expect(video.src).toContain("movie.mp4");
  });

  it("uses hls.js for m3u8 playback", () => {
    const video = document.createElement("video");
    const HlsMock = vi.fn().mockImplementation(() => ({ loadSource: vi.fn(), attachMedia: vi.fn() }));
    const controller = createInlineController(video, HlsMock as never);

    controller.attach("https://cdn.test/movie.m3u8", "m3u8");
    expect(HlsMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the controller test to verify it fails**

Run: `npm run test -- tests/unit/sidepanel/inline-controller.test.ts`

Expected: FAIL.

- [ ] **Step 3: Add `hls.js` and implement inline playback**

```json
{
  "dependencies": {
    "hls.js": "^1.5.17",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

```ts
import Hls from "hls.js";

export function createInlineController(
  video: HTMLVideoElement,
  HlsCtor: typeof Hls = Hls
) {
  let hls: Hls | null = null;

  return {
    attach(url: string, mediaType: "mp4" | "webm" | "m3u8") {
      if (mediaType === "m3u8") {
        hls = new HlsCtor();
        hls.loadSource(url);
        hls.attachMedia(video);
        return;
      }

      video.src = url;
    },
    destroy() {
      hls?.destroy();
      video.removeAttribute("src");
    }
  };
}
```

```tsx
import { useEffect, useRef } from "react";
import type { TaskRecord } from "../../shared/contracts";
import { createInlineController } from "../lib/createInlineController";

export function InlineTaskCard({ task }: { task: TaskRecord }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!ref.current || !task.directMediaType) return;
    const controller = createInlineController(ref.current);
    controller.attach(task.sourceUrl, task.directMediaType);

    ref.current.muted = task.muted;
    ref.current.volume = task.volume;
    ref.current.playbackRate = task.rate;

    return () => controller.destroy();
  }, [task.sourceUrl, task.directMediaType, task.muted, task.volume, task.rate]);

  return (
    <article>
      <h3>{task.title}</h3>
      <video ref={ref} controls playsInline />
    </article>
  );
}
```

- [ ] **Step 4: Run the inline controller test**

Run: `npm install`

Expected: `hls.js` is added to `package-lock.json`.

Run: `npm run test -- tests/unit/sidepanel/inline-controller.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
@'
Render direct-media tasks inside the side panel

This adds inline playback support for direct mp4, webm, and m3u8 links so compatible tasks can show real video windows.

Constraint: Edge needs hls.js for m3u8 playback inside the extension
Rejected: Treat all media URLs as native video sources | HLS playback would fail on most systems
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep inline playback logic behind a small controller so card rendering stays declarative
Tested: npm install; npm run test -- tests/unit/sidepanel/inline-controller.test.ts
Not-tested: Real media playback in Edge side panel
'@ | Set-Content .git\COMMIT_MSG
git add package.json package-lock.json src/sidepanel/lib/createInlineController.ts src/sidepanel/components/InlineTaskCard.tsx tests/unit/sidepanel/inline-controller.test.ts
git commit -F .git\COMMIT_MSG
```

### Task 8: Control Webpage-Backed Tasks Through Inactive Tabs

**Files:**
- Create: `src/content/adapters/types.ts`
- Create: `src/content/adapters/html5.ts`
- Create: `src/content/adapters/registry.ts`
- Modify: `src/content/runner.ts`
- Create: `src/background/hidden-page-manager.ts`
- Test: `tests/unit/content/html5-adapter.test.ts`
- Test: `tests/unit/background/hidden-page-manager.test.ts`

- [ ] **Step 1: Write failing tests for adapter selection and tab tracking**

```ts
import { describe, expect, it } from "vitest";
import { createHtml5Adapter } from "../../../src/content/adapters/html5";

describe("createHtml5Adapter", () => {
  it("finds the first video element on the page", () => {
    const video = document.createElement("video");
    document.body.appendChild(video);

    const adapter = createHtml5Adapter(document);

    expect(adapter.canHandle()).toBe(true);
  });
});
```

```ts
import { describe, expect, it, vi } from "vitest";
import { createHiddenPageManager } from "../../../src/background/hidden-page-manager";

describe("hidden page manager", () => {
  it("creates inactive tabs and remembers their ids", async () => {
    const tabs = { create: vi.fn().mockResolvedValue({ id: 77 }) };
    const manager = createHiddenPageManager(tabs as never);

    const tabId = await manager.open("https://site.test/watch");

    expect(tabId).toBe(77);
    expect(tabs.create).toHaveBeenCalledWith({ url: "https://site.test/watch", active: false });
  });
});
```

- [ ] **Step 2: Run the background-runner tests to verify failure**

Run: `npm run test -- tests/unit/content/html5-adapter.test.ts tests/unit/background/hidden-page-manager.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the adapter layer and inactive-tab manager**

```ts
export interface PageAdapter {
  canHandle(): boolean;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  setRate(rate: number): void;
  getHeartbeat(): { currentTime: number; paused: boolean; ended: boolean };
}
```

```ts
import type { PageAdapter } from "./types";

export function createHtml5Adapter(doc: Document): PageAdapter {
  const video = doc.querySelector("video");

  return {
    canHandle: () => Boolean(video),
    async play() {
      await video?.play();
    },
    async pause() {
      video?.pause();
    },
    async stop() {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    },
    setMuted(muted) {
      if (video) video.muted = muted;
    },
    setVolume(volume) {
      if (video) video.volume = volume;
    },
    setRate(rate) {
      if (video) video.playbackRate = rate;
    },
    getHeartbeat() {
      return {
        currentTime: video?.currentTime ?? 0,
        paused: video?.paused ?? true,
        ended: video?.ended ?? false
      };
    }
  };
}
```

```ts
import { createHtml5Adapter } from "./html5";

export function getPageAdapter(doc: Document) {
  const adapter = createHtml5Adapter(doc);
  return adapter.canHandle() ? adapter : null;
}
```

```ts
import { getPageAdapter } from "./adapters/registry";

let adapter = getPageAdapter(document);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!adapter) {
    sendResponse({ ok: false, reason: "unsupported" });
    return;
  }

  if (message.type === "page/play") adapter.play().then(() => sendResponse({ ok: true }));
  if (message.type === "page/pause") adapter.pause().then(() => sendResponse({ ok: true }));
  if (message.type === "page/stop") adapter.stop().then(() => sendResponse({ ok: true }));
  if (message.type === "page/set-audio") {
    adapter.setMuted(message.payload.muted);
    adapter.setVolume(message.payload.volume);
    adapter.setRate(message.payload.rate);
    sendResponse({ ok: true });
  }
  return true;
});
```

```ts
export function createHiddenPageManager(
  tabsApi: Pick<typeof chrome.tabs, "create" | "remove">
) {
  const taskToTab = new Map<string, number>();

  return {
    async open(url: string, taskId?: string) {
      const tab = await tabsApi.create({ url, active: false });
      if (taskId && typeof tab.id === "number") taskToTab.set(taskId, tab.id);
      return tab.id!;
    },
    getTabId(taskId: string) {
      return taskToTab.get(taskId) ?? null;
    },
    async close(taskId: string) {
      const tabId = taskToTab.get(taskId);
      if (typeof tabId === "number") {
        await tabsApi.remove(tabId);
        taskToTab.delete(taskId);
      }
    }
  };
}
```

- [ ] **Step 4: Run the new tests again**

Run: `npm run test -- tests/unit/content/html5-adapter.test.ts tests/unit/background/hidden-page-manager.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
@'
Control webpage-backed tasks through an adapter layer and inactive tabs

This adds the HTML5 page adapter and the inactive-tab manager that back the degraded background mode.

Constraint: Webpage links need a fallback path when direct media extraction fails
Rejected: Declaring all webpage links unsupported | too low a compatibility ceiling for the approved scope
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Add site-specific logic by registering a new adapter instead of hardcoding domains in the runner
Tested: npm run test -- tests/unit/content/html5-adapter.test.ts tests/unit/background/hidden-page-manager.test.ts
Not-tested: Real webpage control in Edge tabs
'@ | Set-Content .git\COMMIT_MSG
git add src/content/adapters/types.ts src/content/adapters/html5.ts src/content/adapters/registry.ts src/content/runner.ts src/background/hidden-page-manager.ts tests/unit/content/html5-adapter.test.ts tests/unit/background/hidden-page-manager.test.ts
git commit -F .git\COMMIT_MSG
```

### Task 9: Add Runtime Cards, Heartbeats, And Automatic Recovery

**Files:**
- Create: `src/sidepanel/components/StatusBadge.tsx`
- Create: `src/sidepanel/components/BackgroundTaskCard.tsx`
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/background/orchestrator.ts`
- Test: `tests/unit/background/recovery.test.ts`
- Test: `tests/unit/sidepanel/background-task-card.test.tsx`

- [ ] **Step 1: Write failing tests for recovery and degraded cards**

```ts
import { describe, expect, it, vi } from "vitest";
import { createOrchestrator } from "../../../src/background/orchestrator";

describe("recovery", () => {
  it("marks a task as error after repeated restore failures", async () => {
    const store = {
      getSnapshot: vi.fn().mockReturnValue([
        { id: "1", sourceUrl: "https://site.test/watch", directMediaType: null, restoreAttempts: 2 }
      ]),
      update: vi.fn()
    };
    const orchestrator = createOrchestrator({
      store,
      scheduler: { enqueue: vi.fn(), claimNextBatch: vi.fn().mockReturnValue([]), release: vi.fn() },
      resolver: vi.fn()
    });

    await orchestrator.restoreTasks(2);

    expect(store.update).toHaveBeenCalledWith("1", expect.objectContaining({ state: "error" }));
  });
});
```

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BackgroundTaskCard } from "../../../src/sidepanel/components/BackgroundTaskCard";

describe("BackgroundTaskCard", () => {
  it("shows that the task is running in the background", () => {
    render(
      <BackgroundTaskCard
        task={{
          id: "1",
          title: "site.test",
          state: "playing_background",
          sourceUrl: "https://site.test/watch",
          domain: "site.test",
          muted: true,
          volume: 1,
          rate: 1,
          errorMessage: null
        } as never}
      />
    );

    expect(screen.getByText(/background mode/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the recovery tests to verify failure**

Run: `npm run test -- tests/unit/background/recovery.test.ts tests/unit/sidepanel/background-task-card.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement recovery and runtime cards**

```tsx
export function StatusBadge({ state }: { state: string }) {
  return <span data-state={state}>{state.replaceAll("_", " ")}</span>;
}
```

```tsx
import type { TaskRecord } from "../../shared/contracts";
import { StatusBadge } from "./StatusBadge";

export function BackgroundTaskCard({ task }: { task: TaskRecord }) {
  return (
    <article>
      <header>
        <h3>{task.title}</h3>
        <StatusBadge state={task.state} />
      </header>
      <p>Background mode</p>
      <p>{task.sourceUrl}</p>
      {task.errorMessage ? <p>{task.errorMessage}</p> : null}
    </article>
  );
}
```

```ts
// add this method inside createOrchestrator return object
async restoreTasks(maxRestoreAttempts: number) {
  for (const task of deps.store.getSnapshot()) {
    if (task.restoreAttempts >= maxRestoreAttempts) {
      await deps.store.update(task.id, {
        state: "error",
        errorMessage: "Automatic recovery limit reached"
      });
      continue;
    }

    if (task.state === "playing_inline" || task.state === "playing_background") {
      await deps.store.update(task.id, {
        state: "queued",
        restoreAttempts: task.restoreAttempts + 1
      });
      deps.scheduler.enqueue(task.id);
    }
  }
}
```

```tsx
// replace App body with three sections
const runningTasks = tasks.filter((task) =>
  ["playing_inline", "playing_background", "paused", "error"].includes(task.state)
);

return (
  <main className="app-shell">
    <h1>MultiVideo Side Panel</h1>
    <PasteForm onSubmit={addDrafts} />
    <DraftTaskList tasks={draftTasks} onStart={startTask} />
    <section>
      <h2>Running</h2>
      {runningTasks.map((task) =>
        task.effectiveMode === "inline" ? (
          <InlineTaskCard key={task.id} task={task} />
        ) : (
          <BackgroundTaskCard key={task.id} task={task} />
        )
      )}
    </section>
  </main>
);
```

- [ ] **Step 4: Run the recovery and runtime-card tests**

Run: `npm run test -- tests/unit/background/recovery.test.ts tests/unit/sidepanel/background-task-card.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
@'
Surface degraded runtime state and bounded automatic recovery

This adds the background-task card and the restore-attempt guard so failed recovery loops converge to an actionable error state.

Constraint: The product must restore tasks automatically without retrying forever
Rejected: Silent retries without a ceiling | users would lose visibility into broken tasks
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep the restore-attempt limit configurable in code and expose errors in the UI
Tested: npm run test -- tests/unit/background/recovery.test.ts tests/unit/sidepanel/background-task-card.test.tsx
Not-tested: Browser restart recovery in Edge
'@ | Set-Content .git\COMMIT_MSG
git add src/sidepanel/components/StatusBadge.tsx src/sidepanel/components/BackgroundTaskCard.tsx src/sidepanel/App.tsx src/background/orchestrator.ts tests/unit/background/recovery.test.ts tests/unit/sidepanel/background-task-card.test.tsx
git commit -F .git\COMMIT_MSG
```

### Task 10: Add Fixture Pages, Manual QA Docs, And Final Verification

**Files:**
- Create: `scripts/fixture-server.mjs`
- Create: `tests/fixtures/direct-link.html`
- Create: `tests/fixtures/webpage-link.html`
- Create: `README.md`
- Create: `tests/e2e/fixtures.spec.ts`

- [ ] **Step 1: Write a failing fixture smoke test**

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("fixture pages", () => {
  it("includes a direct-link sample and a webpage sample", () => {
    expect(readFileSync("tests/fixtures/direct-link.html", "utf8")).toContain("video");
    expect(readFileSync("tests/fixtures/webpage-link.html", "utf8")).toContain("video");
  });
});
```

- [ ] **Step 2: Run the fixture smoke test to verify failure**

Run: `npm run test -- tests/e2e/fixtures.spec.ts`

Expected: FAIL because the fixture files do not exist yet.

- [ ] **Step 3: Add fixtures, local server, and documentation**

```js
import http from "node:http";
import { readFile } from "node:fs/promises";

const root = new URL("../tests/fixtures/", import.meta.url);

http
  .createServer(async (request, response) => {
    const pathname = request.url === "/" ? "/direct-link.html" : request.url;
    const file = await readFile(new URL(`.${pathname}`, root), "utf8");
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(file);
  })
  .listen(4173, () => {
    console.log("fixture server listening on http://127.0.0.1:4173");
  });
```

```html
<!doctype html>
<html lang="en">
  <body>
    <video controls src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"></video>
  </body>
</html>
```

```html
<!doctype html>
<html lang="en">
  <body>
    <button id="start">Play</button>
    <video controls src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"></video>
    <script>
      document.getElementById("start").addEventListener("click", () => {
        document.querySelector("video").play();
      });
    </script>
  </body>
</html>
```

```md
# MultiVideo Side Panel

## Development

1. `npm install`
2. `npm run test`
3. `npm run build`

## Load In Edge

1. Open `edge://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `dist` directory

## Manual QA

1. Run `node scripts/fixture-server.mjs`
2. Paste `http://127.0.0.1:4173/direct-link.html`
3. Paste `http://127.0.0.1:4173/webpage-link.html`
4. Start both tasks and verify one renders inline while the webpage task falls back to background mode if direct extraction is unavailable
5. Close and reopen the side panel and verify task state remains visible
```

```ts
import { test, expect } from "@playwright/test";

test("fixture pages load", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/direct-link.html");
  await expect(page.locator("video")).toBeVisible();
});
```

- [ ] **Step 4: Run the full verification set**

Run: `npm run test`

Expected: PASS for all unit tests and fixture smoke tests.

Run: `npm run build`

Expected: PASS and fresh `dist/` output.

Run: `node scripts/fixture-server.mjs`

Expected: `fixture server listening on http://127.0.0.1:4173`

Run: `npm run e2e`

Expected: PASS for fixture-page smoke test after the server is running.

- [ ] **Step 5: Commit**

```powershell
@'
Document and verify the first shippable extension slice

This adds fixture pages, developer instructions, and the final verification commands needed to exercise the extension from a clean checkout.

Constraint: The repository started without setup or QA guidance
Rejected: Relying on tribal knowledge for extension loading and manual checks | too fragile for follow-on workers
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep README verification steps aligned with the actual npm scripts
Tested: npm run test; npm run build; node scripts/fixture-server.mjs; npm run e2e
Not-tested: Real third-party websites outside the local fixtures
'@ | Set-Content .git\COMMIT_MSG
git add scripts/fixture-server.mjs tests/fixtures/direct-link.html tests/fixtures/webpage-link.html README.md tests/e2e/fixtures.spec.ts
git commit -F .git\COMMIT_MSG
```
