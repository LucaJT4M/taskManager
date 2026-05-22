const API_URL = "http://127.0.0.1:8000";

let selectedTaskCard = null;
let currentTask = null;
let editingTaskCard = null;

async function loadTasksFromBackend() {
  const taskList = document.getElementById("taskList");

  try {
    const response = await fetch(`${API_URL}/get_tasks`);

    if (!response.ok) {
      throw new Error(`API-Fehler: ${response.status}`);
    }

    const tasks = await response.json();
    taskList.innerHTML = "";

    tasks.forEach((apiTask) => {
      taskList.appendChild(createTaskCard(mapApiTask(apiTask)));
    });
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

function mapApiTask(apiTask) {
  return {
    id: apiTask.id,
    title: apiTask.title,
    summary: apiTask.conclusion || "",
    priority: String(apiTask.Priority || ""),
    created: formatDisplayDate(apiTask.Date),
    creator: apiTask.User_Name || "",
    deadline: formatDisplayDate(apiTask.Expire_Date)
  };
}

function openDetailModal(
  card,
  title,
  summary,
  priority,
  created,
  creator,
  deadline
) {
  selectedTaskCard = card;
  currentTask = {
    title,
    summary,
    priority,
    created,
    creator,
    deadline
  };

  document.getElementById("detailTitle").innerText = title;
  document.getElementById("detailSummary").innerText = summary;
  document.getElementById("detailPriority").innerText = priority;
  document.getElementById("detailCreated").innerText = created;
  document.getElementById("detailCreator").innerText = creator;
  document.getElementById("detailDeadline").innerText = deadline;

  document.getElementById("detailModal").style.display = "flex";
}

function closeDetailModal() {
  document.getElementById("detailModal").style.display = "none";
}

function openCreateModal() {
  editingTaskCard = null;
  document.getElementById("formTitle").innerText = "Neue Aufgabe erstellen";
  document.querySelector(".save-btn").innerText = "Aufgabe speichern";
  document.getElementById("taskForm").reset();
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
  document.querySelector(".save-btn").innerText = "Änderungen speichern";
  document.getElementById("taskTitle").value = currentTask.title;
  document.getElementById("taskSummary").value = currentTask.summary;
  document.getElementById("taskPriority").value = currentTask.priority;
  document.getElementById("taskCreated").value = toInputDate(currentTask.created);
  document.getElementById("taskCreator").value = currentTask.creator;
  document.getElementById("taskDeadline").value = toInputDate(currentTask.deadline);

  closeDetailModal();
  document.getElementById("createModal").style.display = "flex";
}

function deleteCurrentTask() {
  if (!selectedTaskCard || !currentTask) {
    return;
  }

  const shouldDelete = confirm(`Soll die Aufgabe "${currentTask.title}" wirklich gelöscht werden?`);

  if (shouldDelete) {
    selectedTaskCard.remove();
    selectedTaskCard = null;
    currentTask = null;
    closeDetailModal();
  }
}

document.getElementById("taskForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const task = {
    title: document.getElementById("taskTitle").value.trim(),
    summary: document.getElementById("taskSummary").value.trim(),
    priority: document.getElementById("taskPriority").value,
    created: fromInputDate(document.getElementById("taskCreated").value),
    creator: document.getElementById("taskCreator").value.trim(),
    deadline: fromInputDate(document.getElementById("taskDeadline").value)
  };

  if (editingTaskCard) {
    updateTaskCard(editingTaskCard, task);
  } else {
    document.getElementById("taskList").appendChild(createTaskCard(task));
  }

  closeCreateModal();
  event.target.reset();
  editingTaskCard = null;
});

function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  updateTaskCard(card, task);
  return card;
}

function updateTaskCard(card, task) {
  card.onclick = function() {
    openDetailModal(
      card,
      task.title,
      task.summary,
      task.priority,
      task.created,
      task.creator,
      task.deadline
    );
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

  card.querySelector(".task-title").innerText = task.title;
  card.querySelector(".task-summary").innerText = task.summary;
  card.querySelector(".priority").innerText = `Priorität: ${task.priority || "Offen"}`;
  card.querySelector(".meta-pill").innerText = task.creator || "Unbekannt";
  card.querySelector(".deadline-value").innerText = task.deadline || "Offen";
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

window.onclick = function(event) {
  const detailModal = document.getElementById("detailModal");
  const createModal = document.getElementById("createModal");

  if (event.target === detailModal) {
    closeDetailModal();
  }

  if (event.target === createModal) {
    closeCreateModal();
  }
};

document.addEventListener("DOMContentLoaded", loadTasksFromBackend);