// store.js — data layer (Phase 2: in-memory version)
//
// app.js only talks to these four functions. In Phase 3 we replace this file
// with a Firestore version that exports the same functions, so the UI code
// does not need to change.
//
// Testing tip: add ?fail=1 to the page URL to make every operation fail,
// so you can check that error messages appear correctly.

export const STATUSES = ["todo", "in-progress", "done"];

const SIMULATE_FAILURE = new URLSearchParams(location.search).has("fail");
const LATENCY_MS = 150; // mimics a network round trip

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

let tasks = [
  { id: crypto.randomUUID(), title: "Learn Firebase fundamentals", description: "Understand how Firebase relates to Google Cloud.", status: "done", createdAt: hoursAgo(50), updatedAt: hoursAgo(50) },
  { id: crypto.randomUUID(), title: "Create a Firestore database", description: "Pick a region and design the tasks collection.", status: "in-progress", createdAt: hoursAgo(40), updatedAt: hoursAgo(40) },
  { id: crypto.randomUUID(), title: "Configure Firebase Hosting", description: "", status: "todo", createdAt: hoursAgo(30), updatedAt: hoursAgo(30) },
  { id: crypto.randomUUID(), title: "Implement GitHub Actions", description: "Validate pull requests and deploy main to Hosting.", status: "todo", createdAt: hoursAgo(20), updatedAt: hoursAgo(20) },
  { id: crypto.randomUUID(), title: "Prepare the project demonstration", description: "5–10 minute walkthrough for my manager.", status: "todo", createdAt: hoursAgo(10), updatedAt: hoursAgo(10) },
];

async function simulateNetwork() {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  if (SIMULATE_FAILURE) throw new Error("Simulated failure (?fail=1 in URL)");
}

export async function listTasks() {
  await simulateNetwork();
  return tasks
    .map((t) => ({ ...t }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function addTask({ title, description }) {
  await simulateNetwork();
  const now = new Date();
  const task = { id: crypto.randomUUID(), title, description, status: "todo", createdAt: now, updatedAt: now };
  tasks.push(task);
  return { ...task };
}

export async function updateTask(id, changes) {
  await simulateNetwork();
  const task = tasks.find((t) => t.id === id);
  if (!task) throw new Error(`Task ${id} not found`);

  // Only allow known fields to change
  const allowed = {};
  if ("title" in changes) allowed.title = changes.title;
  if ("description" in changes) allowed.description = changes.description;
  if ("status" in changes) {
    if (!STATUSES.includes(changes.status)) throw new Error(`Invalid status: ${changes.status}`);
    allowed.status = changes.status;
  }

  Object.assign(task, allowed, { updatedAt: new Date() });
  return { ...task };
}

export async function deleteTask(id) {
  await simulateNetwork();
  const before = tasks.length;
  tasks = tasks.filter((t) => t.id !== id);
  if (tasks.length === before) throw new Error(`Task ${id} not found`);
}