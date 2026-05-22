const API_URL = "http://127.0.0.1:8000";
const priorityColors = {
  1: "priority-color-1",
  2: "priority-color-2",
  3: "priority-color-3",
  4: "priority-color-4",
  5: "priority-color-5"
};

let selectedTaskCard = null;
let currentTask = null;
let editingTaskCard = null;
let allTasks = [];
let notifications = [];
let unreadNotificationCount = 0;
let currentCalendarDate = new Date();

async function loadTasksFromBackend() {
  const taskList = document.getElementById("taskList");

  try {
    const response = await fetch(`${API_URL}/get_tasks`);

    if (!response.ok) {
      throw new Error(`API-Fehler: ${response.status}`);
    }

    const tasks = await response.json();
    allTasks = tasks.map((apiTask, index) => mapApiTask(apiTask, index + 1));
    renderTasks();
    addDueSoonNotifications();
    renderCalendar();
  } catch (error) {
    console.error(error);
    taskList.innerHTML = `
      <p class="task-summary">
        Aufgaben konnten nicht aus main.py geladen werden. Starte das Backend mit:
        uvicorn main:app --reload
      </p>
    `;
  }
}

function mapApiTask(apiTask, ticketNumber) {
  return {
    id: apiTask.id || createLocalId(),
    ticketNumber,
    title: apiTask.title,
    summary: apiTask.conclusion || "",
    priority: String(apiTask.Priority || ""),
    created: normalizeDate(apiTask.Date),
    creator: apiTask.User_Name || "",
    deadline: normalizeDate(apiTask.Expire_Date),
    history: [
      {
        action: "Aus Backend geladen",
        time: new Date().toLocaleString("de-DE")
      }
    ]
  };
}

function renderTasks() {
  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";

  allTasks.forEach((task) => {
    taskList.appendChild(createTaskCard(task));
  });
}

function openDetailModal(card, task) {
  selectedTaskCard = card;
  currentTask = task;

  document.getElementById("detailTitle").innerText = task.title;
  document.getElementById("detailSummary").innerText = task.summary;
  document.getElementById("detailPriority").innerText = task.priority || "Offen";
  document.getElementById("detailCreated").innerText = formatDisplayDate(task.created);
  document.getElementById("detailCreator").innerText = task.creator || "Unbekannt";
  document.getElementById("detailDeadline").innerText = formatDisplayDate(task.deadline) || "Offen";
  renderTaskHistory(task);

  document.getElementById("detailModal").style.display = "flex";
}

function closeDetailModal() {
  document.getElementById("detailModal").style.display = "none";
}

function renderTaskHistory(task) {
  const historyContainer = document.getElementById("detailHistory");
  const history = task.history || [];

  historyContainer.innerHTML = "";

  if (history.length === 0) {
    historyContainer.innerHTML = "<span>Noch keine Aenderungen vorhanden.</span>";
    return;
  }

  history.forEach((entry) => {
    const item = document.createElement("div");
    item.innerHTML = `
      <strong>${escapeHtml(entry.action)}</strong>
      <span>${escapeHtml(entry.time)}</span>
    `;
    historyContainer.appendChild(item);
  });
}

function openCreateModal() {
  editingTaskCard = null;
  currentTask = null;
  document.getElementById("formTitle").innerText = "Neue Aufgabe erstellen";
  document.querySelector(".save-btn").innerText = "Aufgabe speichern";
  document.getElementById("taskForm").reset();
  updateDeadlineMinimum();
  document.getElementById("createModal").style.display = "flex";
}

function closeCreateModal() {
  document.getElementById("createModal").style.display = "none";
}

function openEditModal() {
  if (!currentTask || !selectedTaskCard) {
    return;
  }

  editingTaskCard = selectedTaskCard;
  document.getElementById("formTitle").innerText = "Aufgabe bearbeiten";
  document.querySelector(".save-btn").innerText = "Aenderungen speichern";
  document.getElementById("taskTitle").value = currentTask.title;
  document.getElementById("taskSummary").value = currentTask.summary;
  document.getElementById("taskPriority").value = currentTask.priority;
  document.getElementById("taskCreated").value = currentTask.created;
  document.getElementById("taskCreator").value = currentTask.creator;
  document.getElementById("taskDeadline").value = currentTask.deadline;
  updateDeadlineMinimum();

  closeDetailModal();
  document.getElementById("createModal").style.display = "flex";
}

function deleteCurrentTask() {
  if (!selectedTaskCard || !currentTask) {
    return;
  }

  const shouldDelete = confirm(`Soll die Aufgabe "${currentTask.title}" wirklich gelöscht werden?`);

  if (!shouldDelete) {
    return;
  }

  allTasks = allTasks.filter((task) => task.id !== currentTask.id);
  addNotification("Gelöscht", currentTask);
  selectedTaskCard = null;
  currentTask = null;
  closeDetailModal();
  renderTasks();
  renderCalendar();
}

document.getElementById("taskForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const task = {
    id: currentTask?.id || createLocalId(),
    ticketNumber: currentTask?.ticketNumber || getNextTicketNumber(),
    title: document.getElementById("taskTitle").value.trim(),
    summary: document.getElementById("taskSummary").value.trim(),
    priority: document.getElementById("taskPriority").value,
    created: document.getElementById("taskCreated").value,
    creator: document.getElementById("taskCreator").value.trim(),
    deadline: document.getElementById("taskDeadline").value,
    history: currentTask?.history ? [...currentTask.history] : []
  };

  if (!isDateRangeValid(task.created, task.deadline)) {
    alert("Das Ablaufdatum darf nicht vor dem Erstelldatum liegen.");
    return;
  }

  if (editingTaskCard) {
    const taskIndex = allTasks.findIndex((item) => item.id === task.id);
    if (taskIndex !== -1) {
      addTaskHistory(task, "Ticket bearbeitet");
      allTasks[taskIndex] = task;
    }
    addNotification("Bearbeitet", task);
  } else {
    addTaskHistory(task, "Ticket hinzugefügt");
    allTasks.push(task);
    addNotification("Hinzugefügt", task);
  }

  closeCreateModal();
  event.target.reset();
  editingTaskCard = null;
  currentTask = null;
  renderTasks();
  renderCalendar();
  addDueSoonNotifications();
});

function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  updateTaskCard(card, task);
  return card;
}

function updateTaskCard(card, task) {
  card.dataset.taskId = String(task.id);
  card.onclick = function() {
    openDetailModal(card, task);
  };

  card.innerHTML = `
    <div>
      <div class="task-title"></div>
      <p class="task-summary"></p>

      <div class="task-meta">
        <span class="priority"></span>
        <span class="meta-pill"></span>
      </div>
    </div>

    <div class="task-date">
      <span>Ablaufdatum</span>
      <span class="deadline-value"></span>
    </div>
  `;

  card.querySelector(".task-title").innerText = `#${task.ticketNumber} ${task.title}`;
  card.querySelector(".task-summary").innerText = task.summary;
  card.querySelector(".priority").innerText = `Prioritaet: ${task.priority || "Offen"}`;
  card.querySelector(".meta-pill").innerText = task.creator || "Unbekannt";
  card.querySelector(".deadline-value").innerText = formatDisplayDate(task.deadline) || "Offen";
}

function toggleCalendar() {
  const calendarPanel = document.getElementById("calendarPanel");
  calendarPanel.style.display = calendarPanel.style.display === "block" ? "none" : "block";
  renderCalendar();
}

function changeCalendarMonth(direction) {
  currentCalendarDate = new Date(
    currentCalendarDate.getFullYear(),
    currentCalendarDate.getMonth() + direction,
    1
  );
  renderCalendar();
}

function renderCalendar() {
  const calendarGrid = document.getElementById("calendarGrid");
  const calendarTitle = document.getElementById("calendarTitle");

  if (!calendarGrid || !calendarTitle) {
    return;
  }

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthName = currentCalendarDate.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric"
  });
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);

  calendarTitle.innerText = monthName;
  calendarGrid.innerHTML = "";

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const day = document.createElement("div");
    day.className = "calendar-day";
    if (date.getMonth() !== month) {
      day.classList.add("muted");
    }

    day.innerHTML = `<div class="calendar-date">${date.getDate()}</div>`;
    getPriorityGroupsForDate(toIsoDate(date)).forEach((group) => {
      const marker = document.createElement("button");
      marker.type = "button";
      const continuesLeft = index % 7 !== 0 && hasPriorityOnDate(toIsoDate(addDays(date, -1)), group.priority);
      const continuesRight = index % 7 !== 6 && hasPriorityOnDate(toIsoDate(addDays(date, 1)), group.priority);
      marker.className = `calendar-marker ${priorityColors[group.priority] || priorityColors[1]}`;
      marker.classList.toggle("continues-left", continuesLeft);
      marker.classList.toggle("continues-right", continuesRight);
      marker.innerText = continuesLeft ? "" : group.tasks.length > 1
        ? `Prioritaet ${group.priority} ${group.tasks.length}x`
        : `Prioritaet ${group.priority}`;
      marker.title = group.tasks.length > 1
        ? `Prioritaet ${group.priority} ${group.tasks.length}x`
        : `Prioritaet ${group.priority}`;
      marker.onclick = function(event) {
        event.stopPropagation();
        openCalendarTaskModal(group.tasks);
      };
      day.appendChild(marker);
    });

    calendarGrid.appendChild(day);
  }
}

function hasPriorityOnDate(isoDate, priority) {
  return allTasks.some((task) =>
    String(task.priority || "1") === String(priority) &&
    task.created &&
    task.deadline &&
    isDateInTaskRange(isoDate, task)
  );
}

function getPriorityGroupsForDate(isoDate) {
  const groups = {};

  allTasks.forEach((task) => {
    if (!task.created || !task.deadline || !isDateInTaskRange(isoDate, task)) {
      return;
    }

    const priority = task.priority || "1";
    groups[priority] = groups[priority] || [];
    groups[priority].push(task);
  });

  return Object.keys(groups)
    .sort((a, b) => Number(b) - Number(a))
    .map((priority) => ({
      priority,
      tasks: groups[priority]
    }));
}

function openCalendarTaskModal(tasks) {
  const title = document.getElementById("calendarTaskTitle");
  const details = document.getElementById("calendarTaskDetails");
  title.innerText = tasks.length > 1 ? "Tasks im Kalender" : "Task im Kalender";
  details.innerHTML = "";

  tasks.forEach((task) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "calendar-task-link";
    item.innerHTML = `
      <strong>#${task.ticketNumber} ${escapeHtml(task.title)}</strong>
      <span>
        ${escapeHtml(task.summary || "Keine Zusammenfassung")}<br>
        Prioritaet ${escapeHtml(task.priority || "Offen")} -
        ${escapeHtml(formatDisplayDate(task.created) || "Offen")} bis
        ${escapeHtml(formatDisplayDate(task.deadline) || "Offen")}
      </span>
    `;
    item.onclick = function() {
      goToTask(task.id);
    };
    details.appendChild(item);
  });

  document.getElementById("calendarTaskModal").style.display = "flex";
}

function closeCalendarTaskModal() {
  document.getElementById("calendarTaskModal").style.display = "none";
}

function goToTask(taskId) {
  const task = allTasks.find((item) => String(item.id) === String(taskId));
  const card = document.querySelector(`[data-task-id="${String(taskId)}"]`);

  if (!task || !card) {
    return;
  }

  closeCalendarTaskModal();
  closeDetailModal();
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  document.querySelectorAll(".task-card.focused").forEach((item) => item.classList.remove("focused"));
  card.classList.add("focused");
  setTimeout(() => card.classList.remove("focused"), 2200);
  openDetailModal(card, task);
}

function openNotifications() {
  const list = document.getElementById("notificationList");
  list.innerHTML = "";

  if (notifications.length === 0) {
    list.innerHTML = '<p class="task-summary">Keine Benachrichtigungen vorhanden.</p>';
  } else {
    notifications.forEach((notification) => {
      const item = document.createElement("div");
      item.className = "notification-item";
      item.innerHTML = `
        <strong>${escapeHtml(notification.title)}</strong>
        <span>${escapeHtml(notification.time)}</span>
      `;
      list.appendChild(item);
    });
  }

  unreadNotificationCount = 0;
  updateNotificationBadge();
  document.getElementById("notificationModal").style.display = "flex";
}

function closeNotifications() {
  document.getElementById("notificationModal").style.display = "none";
}

function addNotification(action, task) {
  notifications.unshift({
    title: `${action}: #${task.ticketNumber} ${task.title}`,
    time: new Date().toLocaleString("de-DE")
  });
  unreadNotificationCount += 1;
  updateNotificationBadge();
}

function addTaskHistory(task, action) {
  task.history = task.history || [];
  task.history.unshift({
    action,
    time: new Date().toLocaleString("de-DE")
  });
}

function addDueSoonNotifications() {
  allTasks.forEach((task) => {
    if (!task.deadline) {
      return;
    }

    const daysLeft = getDaysUntil(task.deadline);
    const alreadyExists = notifications.some((notification) =>
      notification.title.includes(`#${task.ticketNumber}`) &&
      notification.title.includes("Kurz vor Ablauf")
    );

    if (daysLeft >= 0 && daysLeft <= 2 && !alreadyExists) {
      notifications.unshift({
        title: `Kurz vor Ablauf: #${task.ticketNumber} ${task.title}`,
        time: `Fällig in ${daysLeft} Tag(en)`
      });
      unreadNotificationCount += 1;
    }
  });

  updateNotificationBadge();
}

function updateNotificationBadge() {
  const badge = document.getElementById("notificationBadge");
  if (!badge) {
    return;
  }

  badge.innerText = String(unreadNotificationCount);
  badge.style.display = unreadNotificationCount > 0 ? "inline-flex" : "none";
}

function isDateRangeValid(created, deadline) {
  if (!created || !deadline) {
    return true;
  }

  return new Date(deadline) >= new Date(created);
}

function updateDeadlineMinimum() {
  const createdInput = document.getElementById("taskCreated");
  const deadlineInput = document.getElementById("taskDeadline");

  if (!createdInput || !deadlineInput) {
    return;
  }

  deadlineInput.min = createdInput.value || "";

  if (createdInput.value && deadlineInput.value && deadlineInput.value < createdInput.value) {
    deadlineInput.setCustomValidity("Das Ablaufdatum darf nicht vor dem Erstelldatum liegen.");
  } else {
    deadlineInput.setCustomValidity("");
  }
}

function isDateInTaskRange(isoDate, task) {
  const date = new Date(isoDate);
  const created = new Date(task.created);
  const deadline = new Date(task.deadline);
  return date >= created && date <= deadline;
}

function getDaysUntil(isoDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function getNextTicketNumber() {
  if (allTasks.length === 0) {
    return 1;
  }

  return Math.max(...allTasks.map((task) => Number(task.ticketNumber) || 0)) + 1;
}

function createLocalId() {
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDate(dateString) {
  if (!dateString || dateString === "Offen") {
    return "";
  }

  if (dateString.includes(".")) {
    return toInputDate(dateString);
  }

  return dateString;
}

function toInputDate(dateString) {
  if (!dateString || !dateString.includes(".")) {
    return "";
  }

  const [day, month, year] = dateString.split(".");
  return `${year}-${month}-${day}`;
}

function fromInputDate(dateString) {
  if (!dateString) {
    return "Offen";
  }

  const [year, month, day] = dateString.split("-");
  return `${day}.${month}.${year}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) {
    return "";
  }

  if (dateString.includes(".")) {
    return dateString;
  }

  const [year, month, day] = dateString.split("-");

  if (!year || !month || !day) {
    return dateString;
  }

  return `${day}.${month}.${year}`;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.onclick = function(event) {
  const detailModal = document.getElementById("detailModal");
  const createModal = document.getElementById("createModal");
  const calendarTaskModal = document.getElementById("calendarTaskModal");
  const notificationModal = document.getElementById("notificationModal");

  if (event.target === detailModal) {
    closeDetailModal();
  }

  if (event.target === createModal) {
    closeCreateModal();
  }

  if (event.target === calendarTaskModal) {
    closeCalendarTaskModal();
  }

  if (event.target === notificationModal) {
    closeNotifications();
  }
};

document.getElementById("taskCreated").addEventListener("change", updateDeadlineMinimum);
document.getElementById("taskDeadline").addEventListener("change", updateDeadlineMinimum);
document.addEventListener("DOMContentLoaded", loadTasksFromBackend);
