// app.js — UI logic. Talks only to store.js, never to the database directly.
import { listTasks, addTask, updateTask, deleteTask, STATUSES } from "./store.js";

const STATUS_LABELS = { "todo": "To do", "in-progress": "In progress", "done": "Done" };
const TITLE_MAX = 100;
const DESC_MAX = 500;

const state = {
  tasks: [],
  search: "",
  status: "all",
  editingId: null,
};

const $ = (id) => document.getElementById(id);
const els = {
  form: $("task-form"),
  formHeading: $("form-heading"),
  title: $("title"),
  titleError: $("title-error"),
  description: $("description"),
  descCount: $("desc-count"),
  submit: $("submit-btn"),
  cancel: $("cancel-btn"),
  search: $("search"),
  list: $("task-list"),
  loading: $("loading"),
  empty: $("empty-state"),
  emptyText: $("empty-text"),
  clearFilters: $("clear-filters"),
  summary: $("summary"),
  toast: $("toast"),
  filterButtons: document.querySelectorAll("[data-filter]"),
};

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

init();

async function init() {
  bindEvents();
  await refresh();
  els.loading.hidden = true;
}

// ---------- Data ----------
async function refresh() {
  try {
    state.tasks = await listTasks();
  } catch (err) {
    console.error("listTasks failed:", err);
    showToast("Couldn't load tasks. Check your connection and reload the page.", "error");
  }
  render();
}

// ---------- Events ----------
function bindEvents() {
  els.form.addEventListener("submit", handleSubmit);
  els.cancel.addEventListener("click", exitEditMode);

  els.title.addEventListener("input", () => setTitleError(""));
  els.description.addEventListener("input", updateCounter);

  els.search.addEventListener("input", () => {
    state.search = els.search.value.trim().toLowerCase();
    render();
  });

  els.filterButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      state.status = btn.dataset.filter;
      render();
    })
  );

  els.clearFilters.addEventListener("click", () => {
    state.search = "";
    state.status = "all";
    els.search.value = "";
    render();
  });

  // Event delegation for buttons inside task cards
  els.list.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const task = state.tasks.find((t) => t.id === btn.closest(".task").dataset.id);
    if (!task) return;
    if (btn.dataset.action === "edit") enterEditMode(task);
    if (btn.dataset.action === "delete") handleDelete(task);
  });

  els.list.addEventListener("change", (e) => {
    if (!e.target.matches("select[data-action='status']")) return;
    handleStatusChange(e.target.closest(".task").dataset.id, e.target.value);
  });
}

async function handleSubmit(e) {
  e.preventDefault();
  const title = els.title.value.trim();
  const description = els.description.value.trim();

  const error = validate(title, description);
  if (error) {
    setTitleError(error);
    els.title.focus();
    return;
  }

  const isEdit = Boolean(state.editingId);
  setBusy(true);
  try {
    if (isEdit) {
      await updateTask(state.editingId, { title, description });
      exitEditMode();
      showToast("Task saved.");
    } else {
      await addTask({ title, description });
      els.form.reset();
      updateCounter();
      showToast("Task added.");
    }
    await refresh();
  } catch (err) {
    console.error(isEdit ? "updateTask failed:" : "addTask failed:", err);
    showToast(isEdit ? "Couldn't save the task. Try again." : "Couldn't add the task. Try again.", "error");
  } finally {
    setBusy(false);
  }
}

async function handleStatusChange(id, status) {
  try {
    await updateTask(id, { status });
    showToast(`Moved to ${STATUS_LABELS[status]}.`);
  } catch (err) {
    console.error("updateTask (status) failed:", err);
    showToast("Couldn't change the status. Try again.", "error");
  }
  await refresh(); // re-render either way, so the dropdown never shows a wrong value
}

async function handleDelete(task) {
  if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;
  try {
    await deleteTask(task.id);
    if (state.editingId === task.id) exitEditMode();
    showToast("Task deleted.");
  } catch (err) {
    console.error("deleteTask failed:", err);
    showToast("Couldn't delete the task. Try again.", "error");
  }
  await refresh();
}

// ---------- Form helpers ----------
function validate(title, description) {
  if (!title) return "Enter a title.";
  if (title.length > TITLE_MAX) return `Keep the title under ${TITLE_MAX} characters.`;
  if (description.length > DESC_MAX) return `Keep the description under ${DESC_MAX} characters.`;
  return "";
}

function setTitleError(message) {
  els.titleError.textContent = message;
  els.title.setAttribute("aria-invalid", message ? "true" : "false");
}

function updateCounter() {
  els.descCount.textContent = `${els.description.value.length} / ${DESC_MAX}`;
}

function setBusy(busy) {
  els.submit.disabled = busy;
}

function enterEditMode(task) {
  state.editingId = task.id;
  els.title.value = task.title;
  els.description.value = task.description || "";
  updateCounter();
  setTitleError("");
  els.formHeading.textContent = "Edit task";
  els.submit.textContent = "Save changes";
  els.cancel.hidden = false;
  els.form.scrollIntoView({ behavior: "smooth", block: "start" });
  els.title.focus();
  render();
}

function exitEditMode() {
  state.editingId = null;
  els.form.reset();
  updateCounter();
  setTitleError("");
  els.formHeading.textContent = "Add a task";
  els.submit.textContent = "Add task";
  els.cancel.hidden = true;
  render();
}

// ---------- Rendering ----------
function render() {
  renderCounts();

  const visible = state.tasks.filter(
    (t) =>
      (state.status === "all" || t.status === state.status) &&
      (!state.search || t.title.toLowerCase().includes(state.search))
  );

  els.list.replaceChildren(...visible.map(renderTask));

  const filtering = state.status !== "all" || state.search;
  els.empty.hidden = visible.length > 0;
  els.clearFilters.hidden = !filtering;
  els.emptyText.textContent = filtering
    ? "No tasks match your search or filter."
    : "No tasks yet. Add your first one using the form.";
}

function renderCounts() {
  const counts = { "todo": 0, "in-progress": 0, "done": 0 };
  state.tasks.forEach((t) => { if (t.status in counts) counts[t.status]++; });
  const total = state.tasks.length;

  document.querySelector('[data-count="all"]').textContent = total;
  STATUSES.forEach((s) => {
    document.querySelector(`[data-count="${s}"]`).textContent = counts[s];
    $(`seg-${s}`).style.width = total ? `${(counts[s] / total) * 100}%` : "0";
  });

  els.filterButtons.forEach((btn) =>
    btn.setAttribute("aria-pressed", String(btn.dataset.filter === state.status))
  );

  els.summary.textContent = total
    ? `${counts.done} of ${total} done, ${counts["in-progress"]} in progress`
    : "No tasks yet";
}

// Builds DOM with textContent only (never innerHTML) so user input can't inject HTML.
function renderTask(task) {
  const li = el("li", "task");
  li.dataset.id = task.id;
  li.dataset.status = task.status;
  if (task.id === state.editingId) li.classList.add("is-editing");

  const main = el("div", "task-main");
  main.append(el("h3", "", task.title));
  if (task.description) main.append(el("p", "task-desc", task.description));
  main.append(el("p", "task-meta", `Created ${dateFormat.format(task.createdAt)}`));

  const actions = el("div", "task-actions");

  const selectId = `status-${task.id}`;
  const label = el("label", "visually-hidden", `Status for ${task.title}`);
  label.htmlFor = selectId;
  const select = el("select");
  select.id = selectId;
  select.dataset.action = "status";
  STATUSES.forEach((s) => {
    const opt = el("option", "", STATUS_LABELS[s]);
    opt.value = s;
    opt.selected = s === task.status;
    select.append(opt);
  });

  const edit = el("button", "btn btn-quiet btn-small", "Edit");
  edit.type = "button";
  edit.dataset.action = "edit";
  edit.setAttribute("aria-label", `Edit ${task.title}`);

  const del = el("button", "btn btn-danger btn-small", "Delete");
  del.type = "button";
  del.dataset.action = "delete";
  del.setAttribute("aria-label", `Delete ${task.title}`);

  actions.append(label, select, edit, del);
  li.append(main, actions);
  return li;
}

function el(tag, className = "", text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let toastTimer;
function showToast(message, type = "success") {
  els.toast.textContent = message;
  els.toast.className = `toast toast-${type} is-visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), type === "error" ? 6000 : 3000);
}