
"use strict";

const API_URL = "http://localhost:5249/api/tasks";

let toastTimer = null;
let allTasks = [];
let activeFilter = "all";

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskDeadline = document.getElementById("taskDeadline");
const taskPriority = document.getElementById("taskPriority");
const saveButton = document.getElementById("saveButton");
const apiNotice = document.getElementById("apiNotice");
const toast = document.getElementById("toast");
const todayDate = document.getElementById("todayDate");

function getTodayString() {
    const today = new Date();
    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");
}

function showToast(message, type = "success") {
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 2800);
}

function showApiError(message) {
    if (apiNotice) {
        apiNotice.hidden = false;
        apiNotice.textContent = message;
    }
    console.error(message);
}

function setCounter(ids, selector, value) {
    for (const id of ids) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            return;
        }
    }

    const element = document.querySelector(selector);
    if (element) element.textContent = value;
}

function updateDashboard(tasks) {
    const today = getTodayString();
    const pending = tasks.filter(task => !task.completed);
    const completed = tasks.filter(task => task.completed);
    const overdue = pending.filter(task => task.deadline < today);

    setCounter(
        ["totalTasks", "totalTaskCount", "totalCount"],
        '[data-stat="total"]',
        tasks.length
    );

    setCounter(
        ["pendingTasks", "pendingTaskCount", "pendingCount"],
        '[data-stat="pending"]',
        pending.length
    );

    setCounter(
        ["completedTasks", "completedTaskCount", "completedCount"],
        '[data-stat="completed"]',
        completed.length
    );

    setCounter(
        ["overdueTasks", "overdueTaskCount", "overdueCount"],
        '[data-stat="overdue"]',
        overdue.length
    );
}

// Render tasks and their Done buttons.
function renderTasks(tasks) {
    const container =
        document.getElementById("taskList") ||
        document.getElementById("tasksList") ||
        document.getElementById("myTasksList");

    if (!container) {
        console.error(
            "Task-list container not found. Check the ID in index.html."
        );
        return;
    }

    const searchInput =
        document.getElementById("searchTasks") ||
        document.getElementById("taskSearch") ||
        document.querySelector('input[type="search"]');

    const query = (searchInput?.value || "").trim().toLowerCase();

    let visibleTasks = tasks.filter(task => {
        const matchesSearch =
            (task.title || "").toLowerCase().includes(query) ||
            (task.description || "").toLowerCase().includes(query);

        const isOverdue =
            !task.completed && task.deadline < getTodayString();

        let matchesFilter = true;

        if (activeFilter === "pending") {
            matchesFilter = !task.completed;
        } else if (activeFilter === "completed") {
            matchesFilter = task.completed;
        } else if (activeFilter === "overdue") {
            matchesFilter = isOverdue;
        }

        return matchesSearch && matchesFilter;
    });

    const sortSelect =
        document.getElementById("sortTasks") ||
        document.getElementById("taskSort");

    if (sortSelect?.value === "deadline-latest") {
        visibleTasks.sort((a, b) =>
            (b.deadline || "").localeCompare(a.deadline || "")
        );
    } else {
        visibleTasks.sort((a, b) =>
            (a.deadline || "").localeCompare(b.deadline || "")
        );
    }

    container.replaceChildren();

    if (visibleTasks.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = query
            ? "No tasks match your search."
            : "No tasks to display. Add a new task to get started.";
        container.appendChild(empty);
    }

    visibleTasks.forEach(task => {
        const card = document.createElement("article");
        card.className = "task-item";

        const title = document.createElement("h3");
        title.textContent = task.title || "Untitled task";

        const description = document.createElement("p");
        description.textContent = task.description || "No description";

        const details = document.createElement("p");
        details.textContent =
            `Deadline: ${task.deadline || "Not set"} · ` +
            `Priority: ${task.priority || "Medium"} · ` +
            `Status: ${task.completed ? "Completed" : "Pending"}`;

        card.append(title, description, details);

        // NEW: Add Done button to each pending task.
        if (!task.completed) {
            const doneButton = document.createElement("button");
            doneButton.type = "button";
            doneButton.textContent = "✓ Done";
            doneButton.className = "done-button";

            doneButton.addEventListener("click", async () => {
                doneButton.disabled = true;
                await markTaskDone(task.id);
                doneButton.disabled = false;
            });

            card.appendChild(doneButton);
        } else {
            const completedLabel = document.createElement("span");
            completedLabel.className = "completed-label";
            completedLabel.textContent = "✓ Completed";
            card.appendChild(completedLabel);
        }

        container.appendChild(card);
    });

    const badge =
        document.getElementById("taskCount") ||
        document.getElementById("tasksCount");

    if (badge) {
        badge.textContent = `${visibleTasks.length} tasks`;
    }
}

// NEW: Mark a task as completed in the API.

async function markTaskDone(taskId) {
    try {
        console.log("Completing task:", taskId);

        const response = await fetch(
            `${API_URL}/${encodeURIComponent(taskId)}/complete`,
            {
                method: "PATCH"
            }
        );

        const responseText = await response.text();

        console.log("Completion status:", response.status);
        console.log("Completion response:", responseText);

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${responseText || "No response details"}`
            );
        }

        await loadTasks();
        showToast("Task completed successfully!");

    } catch (error) {
        console.error("Complete task error:", error);
        showToast(error.message, "error");
    }
}

// Load saved tasks from the backend.
async function loadTasks() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Unable to load tasks (${response.status}).`);
        }

        const data = await response.json();
        allTasks = Array.isArray(data) ? data : data.tasks;

        if (!Array.isArray(allTasks)) {
            throw new Error("The API response is not a task array.");
        }

        updateDashboard(allTasks);
        renderTasks(allTasks);

        if (apiNotice) apiNotice.hidden = true;

        console.log("Tasks loaded:", allTasks);
    } catch (error) {
        showApiError(error.message);
    }
}

// Submit a new task.
taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (apiNotice) apiNotice.hidden = true;

    if (!taskTitle.value.trim()) {
        showToast("Please enter a task title.", "error");
        taskTitle.focus();
        return;
    }

    if (!taskDeadline.value) {
        showToast("Please select a deadline.", "error");
        taskDeadline.focus();
        return;
    }

    if (taskDeadline.value < getTodayString()) {
        showToast("Please choose today or a later date.", "error");
        taskDeadline.focus();
        return;
    }

    saveButton.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: taskTitle.value.trim(),
                description: taskDescription.value.trim(),
                deadline: taskDeadline.value,
                priority: taskPriority.value
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => null);
            const message =
                Object.values(error?.errors ?? {}).flat()[0] ||
                error?.message ||
                `The API returned an error (${response.status}).`;

            showToast(message, "error");
            return;
        }

        const savedTask = await response.json().catch(() => null);
        console.log("Saved task:", savedTask);

        taskForm.reset();
        taskPriority.value = "Medium";

        await loadTasks();
        showToast("Task added successfully.");
    } catch (error) {
        console.error(error);
        showToast("Cannot reach the API. Is it running?", "error");
    } finally {
        saveButton.disabled = false;
    }
});

// Search tasks.
const searchInput =
    document.getElementById("searchTasks") ||
    document.getElementById("taskSearch") ||
    document.querySelector('input[type="search"]');

if (searchInput) {
    searchInput.addEventListener("input", () => renderTasks(allTasks));
}

// Sort tasks.
const sortSelect =
    document.getElementById("sortTasks") ||
    document.getElementById("taskSort");

if (sortSelect) {
    sortSelect.addEventListener("change", () => renderTasks(allTasks));
}

// Filter tabs.
document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        renderTasks(allTasks);
    });
});

// Display today's date.
if (todayDate) {
    todayDate.textContent = new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

taskDeadline.min = getTodayString();

// Load tasks when the page opens.
loadTasks();
