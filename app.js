"use strict";

/*
 * Study Routine (front end only, no API yet)
 * The form can be filled in and checked, but nothing is saved or sent.
 * When the API is ready, send the task from the "API HOOK" spot below.
 */

let toastTimer = null;

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDeadline = document.getElementById("taskDeadline");
const taskPriority = document.getElementById("taskPriority");
const apiNotice = document.getElementById("apiNotice");
const toast = document.getElementById("toast");

// Get today's date in YYYY-MM-DD format.
function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Show a notification.
function showToast(message, type = "success") {
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 2800);
}

// Check the form, then explain that saving is not available yet.
taskForm.addEventListener("submit", event => {
    event.preventDefault();
    apiNotice.hidden = true;

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

    if (!["Low", "Medium", "High"].includes(taskPriority.value)) {
        showToast("Please choose a valid priority.", "error");
        taskPriority.focus();
        return;
    }

    // API HOOK: send the task here once the API exists, for example
    //   fetch("http://localhost:3000/api/tasks", { method: "POST", ... })
    // Until then nothing is stored or sent.
    apiNotice.hidden = false;
    showToast("Task not saved. The API is not connected yet.", "error");
});

// Editing the form hides the notice again.
taskForm.addEventListener("input", () => {
    apiNotice.hidden = true;
});

// Initialize the page.
document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });

taskDeadline.min = getTodayString();