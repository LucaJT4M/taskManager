const API_URL = "http://192.168.88.69:8000"; // Adresse des lokalen Backends.
const priorityColors = { // Verknüpft Prioritäten mit CSS-Klassen für Kalenderfarben.
  1: "priority-color-1", // Farbe für Priorität 1.
  2: "priority-color-2", // Farbe für Priorität 2.
  3: "priority-color-3", // Farbe für Priorität 3.
  4: "priority-color-4", // Farbe für Priorität 4.
  5: "priority-color-5" // Farbe für Priorität 5.
};

let selectedTaskCard = null; // Speichert die aktuell angeklickte Aufgabenkarte.
let currentTask = null; // Speichert die aktuell ausgewählte Aufgabe.
let editingTaskCard = null; // Ist gesetzt, wenn gerade eine bestehende Aufgabe bearbeitet wird.
let allTasks = []; // Enthält alle Aufgaben, die in der UI angezeigt werden.
let notifications = []; // Enthält alle Benachrichtigungen.
let unreadNotificationCount = 0; // Anzahl der ungelesenen Benachrichtigungen.
let currentCalendarDate = new Date(); // Monat und Jahr, die der Kalender gerade zeigt.

async function loadTasksFromBackend() { // Lädt Aufgaben beim Start aus dem Backend.
  const taskList = document.getElementById("taskList"); // Container, in dem die Aufgaben angezeigt werden.

  try { // Versucht, die Daten vom Backend zu holen.
    const response = await fetch(`${API_URL}/get_tasks`, {
      cache: "no-store"
    }); // Sendet eine GET-Anfrage an die Backend-Route.

    if (!response.ok) { // Prüft, ob die Antwort erfolgreich war.
      const errorText = await response.text(); // Liest eine mögliche Fehlermeldung vom Backend.
      throw new Error(`API erreichbar, aber Fehler ${response.status}: ${errorText || response.statusText}`); // Gibt den Fehlerstatus weiter.
    }

    const tasks = await response.json(); // Wandelt die JSON-Antwort in JavaScript-Daten um.

    if (!Array.isArray(tasks)) { // Das Backend muss eine Liste von Aufgaben liefern.
      throw new Error("API-Antwort ist keine Aufgabenliste.");
    }

    allTasks = tasks.map((apiTask, index) => mapApiTask(apiTask, index + 1)); // Formatiert jede Backend-Aufgabe für die UI.
  } catch (error) { // Wird ausgeführt, wenn Backend oder Netzwerk nicht erreichbar sind.
    console.error(error); // Schreibt den technischen Fehler in die Browser-Konsole.
    taskList.innerHTML = `
      <p class="task-summary">
        Aufgaben konnten nicht aus main.py geladen werden.
        ${escapeHtml(error.message || "Unbekannter Fehler.")}
      </p>
    `; // Zeigt dem Benutzer eine hilfreiche Fehlermeldung an.
    return;
  }

  renderTasks(); // Zeichnet die Aufgabenliste neu.

  try {
    addDueSoonNotifications(); // Erstellt Hinweise für bald fällige Aufgaben.
    renderCalendar(); // Zeichnet den Kalender mit den geladenen Aufgaben.
  } catch (error) {
    console.error("Aufgaben wurden geladen, aber Zusatzfunktionen konnten nicht gerendert werden:", error);
  }
}

function mapApiTask(apiTask, ticketNumber) { // Wandelt eine Backend-Aufgabe in das Format der Oberfläche um.
  return {
    id: apiTask.id || createLocalId(), // Nutzt die Backend-ID oder erstellt lokal eine Ersatz-ID.
    ticketNumber, // Laufende Nummer für die Anzeige.
    title: apiTask.title, // Titel aus dem Backend.
    summary: apiTask.conclusion || "", // Beschreibung aus dem Backend oder leerer Text.
    priority: String(apiTask.priority ?? apiTask.Priority ?? ""), // Priorität als String, passend zum Formularwert.
    created: normalizeDate(apiTask.date ?? apiTask.Date), // Erstelldatum im Eingabeformat yyyy-mm-dd.
    creator: apiTask.user_name ?? apiTask.User_Name ?? "", // Name des Erstellers.
    deadline: normalizeDate(apiTask.expire_date ?? apiTask.Expire_Date), // Ablaufdatum im Eingabeformat yyyy-mm-dd.
    history: [ // Startet die Historie mit einem Ladeeintrag.
      {
        action: "Aus Backend geladen", // Text des Historieneintrags.
        time: new Date().toLocaleString("de-DE") // Zeitpunkt im deutschen Datumsformat.
      }
    ],
    checked: apiTask.checked ?? apiTask.Checked ?? false // Erledigt-Status, standardmäßig false.
  };
}

function mapUiTaskToApiTask(task) { // Wandelt eine UI-Aufgabe in das Format des FastAPI-Backends um.
  return {
    id: Number.isInteger(Number(task.id)) ? Number(task.id) : null,
    title: task.title,
    conclusion: task.summary,
    priority: Number(task.priority) || 1,
    date: task.created || "",
    user_name: task.creator || "",
    expire_date: task.deadline || "",
    checked: task.checked || null  };
}

async function sendTaskToBackend(task, method) { // Speichert eine Aufgabe per POST oder PUT in der Datenbank.
  const isUpdate = method === "PUT"; // PUT braucht die ID in der URL.
  const url = isUpdate ? `${API_URL}/update_task/${task.id}` : `${API_URL}/post_tasks/`; // Passender Backend-Endpunkt.
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(mapUiTaskToApiTask(task))
  });

  const result = await response.json(); // Liest die Backend-Antwort.

  if (!response.ok || result.error) { // FastAPI kann technische Fehler oder JSON-Fehler liefern.
    throw new Error(result.error || `API-Fehler: ${response.status}`);
  }

  return result.new_task || task; // POST liefert die neu erstellte Aufgabe inklusive Datenbank-ID.
}

async function deleteTaskInBackend(taskId) { // Löscht eine Aufgabe dauerhaft in der Datenbank.
  const response = await fetch(`${API_URL}/delete_task/${taskId}`, {
    method: "DELETE"
  });
  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || `API-Fehler: ${response.status}`);
  }
}

function renderTasks() { // Baut die Aufgabenliste aus allTasks komplett neu auf.
  const taskList = document.getElementById("taskList"); // Holt den Aufgabencontainer.
  taskList.innerHTML = ""; // Entfernt alte Karten, damit keine Duplikate entstehen.

  allTasks.forEach((task) => { // Geht alle Aufgaben durch.
    taskList.appendChild(createTaskCard(task)); // Erstellt und fügt eine Aufgabenkarte ein.
  });
}

function openDetailModal(card, task) { // Öffnet die Detailansicht für eine Aufgabe.
  selectedTaskCard = card;
  currentTask = task;

  document.getElementById("detailTitle").innerText = task.title;
  document.getElementById("detailSummary").innerText = task.summary;
  document.getElementById("detailPriority").innerText = task.priority || "Offen";
  document.getElementById("detailCreated").innerText = formatDisplayDate(task.created);
  document.getElementById("detailCreator").innerText = task.creator || "Unbekannt";
  document.getElementById("detailDeadline").innerText = formatDisplayDate(task.deadline) || "Offen";

  // --- Neu: checked-Status in der Detailansicht setzen ---
  const detailEditedEl = document.getElementById("detailEdited");
  if (detailEditedEl) {
    detailEditedEl.innerText = task.checked ? "Ja" : "Nein";
  }

  renderTaskHistory(task);
  document.getElementById("detailModal").style.display = "flex";
}

function closeDetailModal() { // Schließt die Detailansicht.
  document.getElementById("detailModal").style.display = "none"; // Versteckt den Detaildialog.
}

function renderTaskHistory(task) { // Zeigt die Historie einer Aufgabe im Detaildialog.
  const historyContainer = document.getElementById("detailHistory"); // Container für Historieneinträge.
  const history = task.history || []; // Nutzt eine leere Liste, wenn keine Historie existiert.

  historyContainer.innerHTML = ""; // Entfernt alte Historieneinträge.

  if (history.length === 0) { // Prüft, ob es überhaupt Historieneinträge gibt.
    historyContainer.innerHTML = "<span>Noch keine Aenderungen vorhanden.</span>"; // Zeigt einen Ersatztext.
    return; // Beendet die Funktion, weil nichts weiter gerendert werden muss.
  }

  history.forEach((entry) => { // Erstellt für jeden Historieneintrag ein Element.
    const item = document.createElement("div"); // Erstellt ein neues HTML-Element.
    item.innerHTML = `
      <strong>${escapeHtml(entry.action)}</strong>
      <span>${escapeHtml(entry.time)}</span>
    `; // Setzt Aktion und Zeitpunkt; escapeHtml verhindert unsicheren HTML-Code.
    historyContainer.appendChild(item); // Fügt den Eintrag in den Dialog ein.
  });
}

function openCreateModal() { // Öffnet das Formular für eine neue Aufgabe.
  editingTaskCard = null; // Deaktiviert den Bearbeiten-Modus.
  currentTask = null; // Entfernt eine eventuell vorher ausgewählte Aufgabe.
  document.getElementById("formTitle").innerText = "Neue Aufgabe erstellen"; // Setzt die Formularüberschrift.
  document.querySelector(".save-btn").innerText = "Aufgabe speichern"; // Setzt den Buttontext für neue Aufgaben.
  document.getElementById("taskForm").reset(); // Leert alle Formularfelder.
  updateDeadlineMinimum(); // Aktualisiert die Datumsprüfung.
  document.getElementById("createModal").style.display = "flex"; // Zeigt den Formulardialog.
}

function closeCreateModal() { // Schließt den Formulardialog.
  document.getElementById("createModal").style.display = "none"; // Versteckt das Formular.
}

function openEditModal() { // Öffnet das Formular zum Bearbeiten der aktuellen Aufgabe.
  if (!currentTask || !selectedTaskCard) return;

  editingTaskCard = selectedTaskCard;
  document.getElementById("formTitle").innerText = "Aufgabe bearbeiten";
  document.querySelector(".save-btn").innerText = "Änderungen speichern";
  document.getElementById("taskTitle").value = currentTask.title || "";
  document.getElementById("taskSummary").value = currentTask.summary || "";
  document.getElementById("taskPriority").value = currentTask.priority || "1";
  document.getElementById("taskCreated").value = currentTask.created || "";
  document.getElementById("taskCreator").value = currentTask.creator || "";
  document.getElementById("taskDeadline").value = currentTask.deadline || "";
  updateDeadlineMinimum();

  // Setze die Radios für "Erledigt" anhand des Task-Werts
  setFormCheckedRadios(!!currentTask.checked);

  closeDetailModal();
  document.getElementById("createModal").style.display = "flex";
}

function closeEditModal() { // Schließt das Bearbeitungsformular.
  document.getElementById("createModal").style.display = "none"; // Versteckt das Formular.
}

// Helper: aktuellen Wert des "Erledigt" Feldes aus dem Formular lesen
function getFormCheckedValue() {
  const checked = document.querySelector('input[name="taskChecked"]:checked');
  return checked ? (checked.value === 'true') : false;
}

// Helper: Radios im Formular für "Erledigt" setzen
function setFormCheckedRadios(value) {
  const yes = document.getElementById('taskEditedYes');
  const no = document.getElementById('taskEditedNo');
  if (yes && no) {
    yes.checked = !!value;
    no.checked = !value;
  }
}

// Wenn ein Task ins Bearbeitungsformular geladen wird: Felder + Radios setzen
function populateFormForEdit(task) {
  if (document.getElementById('taskTitle')) document.getElementById('taskTitle').value = task.title || '';
  if (document.getElementById('taskSummary')) document.getElementById('taskSummary').value = task.summary || '';
  if (document.getElementById('taskPriority')) document.getElementById('taskPriority').value = task.priority || '1';
  if (document.getElementById('taskCreated')) document.getElementById('taskCreated').value = task.created || '';
  if (document.getElementById('taskCreator')) document.getElementById('taskCreator').value = task.creator || '';
  if (document.getElementById('taskDeadline')) document.getElementById('taskDeadline').value = task.deadline || '';

  setFormCheckedRadios(!!task.checked);
}

async function deleteCurrentTask() { // Löscht die aktuell ausgewählte Aufgabe aus der Oberfläche und Datenbank.
  if (!selectedTaskCard || !currentTask) { // Prüft, ob eine Aufgabe ausgewählt ist.
    return; // Bricht ab, wenn keine Aufgabe vorhanden ist.
  }

  const shouldDelete = confirm(`Soll die Aufgabe "${currentTask.title}" wirklich geloescht werden?`); // Sicherheitsabfrage vor dem Löschen.

  if (!shouldDelete) { // Benutzer hat abgebrochen.
    return; // Löscht nichts.
  }

  try {
    await deleteTaskInBackend(currentTask.id); // Löscht die Aufgabe über den DELETE-Endpunkt.
    allTasks = allTasks.filter((task) => task.id !== currentTask.id); // Entfernt die Aufgabe aus dem lokalen Array.
    addNotification("Geloescht", currentTask); // Erstellt eine Benachrichtigung.
    selectedTaskCard = null; // Löscht die aktuelle Karten-Auswahl.
    currentTask = null; // Löscht die aktuelle Aufgaben-Auswahl.
    closeDetailModal(); // Schließt die Detailansicht.
    renderTasks(); // Aktualisiert die Aufgabenliste.
    renderCalendar(); // Aktualisiert den Kalender.
  } catch (error) {
    console.error(error);
    alert("Die Aufgabe konnte nicht in der Datenbank geloescht werden.");
  }
}

document.getElementById("taskForm").addEventListener("submit", async function(event) { // Reagiert auf das Absenden des Formulars.
  event.preventDefault(); // Verhindert das Neuladen der Seite.
  const submitButton = event.target.querySelector(".save-btn"); // Speicherbutton für Ladezustand.
  const isEditing = Boolean(editingTaskCard); // Merkt den Modus für API-Aufruf und Buttontext.

  const task = { // Sammelt alle Formularwerte in einem Aufgabenobjekt.
    id: currentTask?.id || createLocalId(), // Behält vorhandene ID oder erstellt eine neue lokale ID.
    ticketNumber: currentTask?.ticketNumber || getNextTicketNumber(), // Behält vorhandene Ticketnummer oder vergibt die nächste.
    title: document.getElementById("taskTitle").value.trim(), // Liest den Titel ohne Leerzeichen am Rand.
    summary: document.getElementById("taskSummary").value.trim(), // Liest die Zusammenfassung ohne Leerzeichen am Rand.
    priority: document.getElementById("taskPriority").value, // Liest die ausgewählte Priorität.
    created: document.getElementById("taskCreated").value, // Liest das Erstelldatum.
    creator: document.getElementById("taskCreator").value.trim(), // Liest den Ersteller ohne Leerzeichen am Rand.
    deadline: document.getElementById("taskDeadline").value, // Liest das Ablaufdatum.
    history: currentTask?.history ? [...currentTask.history] : [], // Übernimmt vorhandene Historie oder startet leer.
    checked: getFormCheckedValue() // <-- hier wird der Radio-Wert gelesen (true/false)
  };

  if (!isDateRangeValid(task.created, task.deadline)) { // Prüft, ob das Ablaufdatum nach dem Erstelldatum liegt.
    alert("Das Ablaufdatum darf nicht vor dem Erstelldatum liegen."); // Zeigt eine Warnung.
    return; // Speichert die Aufgabe nicht.
  }

  submitButton.disabled = true; // Verhindert doppelte Speicheranfragen.
  submitButton.innerText = "Speichere...";

  try {
    if (isEditing) { // Bearbeiten-Modus: vorhandene Aufgabe aktualisieren.
      await sendTaskToBackend(task, "PUT"); // Speichert Änderungen dauerhaft in der Datenbank.
      const taskIndex = allTasks.findIndex((item) => item.id === task.id); // Sucht die Aufgabe im Array.
      if (taskIndex !== -1) { // Prüft, ob die Aufgabe gefunden wurde.
        addTaskHistory(task, "Ticket bearbeitet"); // Fügt einen Historieneintrag hinzu.
        allTasks[taskIndex] = task; // Ersetzt die alte Aufgabe.
      }
      addNotification("Bearbeitet", task); // Erstellt eine Bearbeiten-Benachrichtigung.
    } else { // Erstellen-Modus: neue Aufgabe hinzufügen.
      const createdTask = await sendTaskToBackend(task, "POST"); // Erstellt die Aufgabe dauerhaft in der Datenbank.
      const mappedTask = mapApiTask(createdTask, getNextTicketNumber()); // Nutzt die Datenbank-ID aus der API-Antwort.
      mappedTask.history = task.history; // Übernimmt die lokale Historie für die aktuelle Anzeige.
      addTaskHistory(mappedTask, "Ticket hinzugefuegt"); // Fügt einen Historieneintrag hinzu.
      allTasks.push(mappedTask); // Speichert die neue Aufgabe lokal.
      addNotification("Hinzugefuegt", mappedTask); // Erstellt eine Hinzufügen-Benachrichtigung.
    }

    closeCreateModal(); // Schließt das Formular.
    event.target.reset(); // Leert das Formular.
    editingTaskCard = null; // Beendet den Bearbeiten-Modus.
    currentTask = null; // Entfernt die aktuelle Aufgaben-Auswahl.
    renderTasks(); // Aktualisiert die Aufgabenliste.
    renderCalendar(); // Aktualisiert den Kalender.
    addDueSoonNotifications(); // Prüft auf neue Fälligkeitswarnungen.
  } catch (error) {
    console.error(error);
    alert("Die Aufgabe konnte nicht in der Datenbank gespeichert werden.");
  } finally {
    submitButton.disabled = false;
    submitButton.innerText = isEditing ? "Aenderungen speichern" : "Aufgabe speichern";
  }
});

function createTaskCard(task) { // Erstellt eine neue Aufgabenkarte.
  const card = document.createElement("div"); // Erzeugt ein div für die Karte.
  card.className = "task-card"; // Gibt der Karte das passende CSS-Styling.
  updateTaskCard(card, task); // Füllt die Karte mit Aufgabendaten.
  return card; // Gibt die fertige Karte zurück.
}

function updateTaskCard(card, task) { // Befüllt eine Aufgabenkarte mit Daten.
  card.dataset.taskId = String(task.id);
  card.onclick = function() {
    openDetailModal(card, task);
  };

  // Karte erweitert um einen Status-Pill (Erledigt / Offen)
  card.innerHTML = `
    <div>
      <div class="task-title"></div>
      <p class="task-summary"></p>

      <div class="task-meta">
        <span class="priority"></span>
        <span class="meta-pill"></span>
        <span class="status-pill" style="margin-left:8px; font-weight:700;"></span>
      </div>
    </div>

    <div class="task-date">
      <span>Ablaufdatum</span>
      <span class="deadline-value"></span>
    </div>
  `;

  card.querySelector(".task-title").innerText = `#${task.ticketNumber} ${task.title}`;
  card.querySelector(".task-summary").innerText = task.summary || "";
  card.querySelector(".priority").innerText = `Priorität: ${task.priority || "Offen"}`;
  card.querySelector(".meta-pill").innerText = task.creator || "Unbekannt";
  card.querySelector(".deadline-value").innerText = formatDisplayDate(task.deadline) || "Offen";

  // --- Neu: Status-Pill setzen ---
  const statusEl = card.querySelector(".status-pill");
  if (statusEl) {
    statusEl.innerText = task.checked ? "Erledigt" : "Offen";
    statusEl.style.color = task.checked ? "var(--success)" : "var(--muted)";
  }

  // Falls Kalender-Marker o.ä. abhängig von checked sind: hier ergänzen (optional)
}

function toggleCalendar() { // Klappt den Kalender ein oder aus.
  const calendarPanel = document.getElementById("calendarPanel"); // Holt den Kalenderbereich.
  calendarPanel.style.display = calendarPanel.style.display === "block" ? "none" : "block"; // Wechselt zwischen sichtbar und unsichtbar.
  renderCalendar(); // Zeichnet den Kalender neu.
}

function changeCalendarMonth(direction) { // Wechselt den angezeigten Monat.
  currentCalendarDate = new Date( // Erstellt ein Datum für den neuen Monat.
    currentCalendarDate.getFullYear(), // Nutzt das aktuelle Kalenderjahr.
    currentCalendarDate.getMonth() + direction, // Addiert oder subtrahiert einen Monat.
    1 // Setzt den Tag auf den Monatsersten.
  );
  renderCalendar(); // Zeichnet den Kalender neu.
}

function renderCalendar() { // Baut die Monatsansicht des Kalenders.
  const calendarGrid = document.getElementById("calendarGrid"); // Container für Kalendertage.
  const calendarTitle = document.getElementById("calendarTitle"); // Überschrift für Monat und Jahr.

  if (!calendarGrid || !calendarTitle) { // Prüft, ob die Kalender-Elemente existieren.
    return; // Bricht ab, wenn der Kalender nicht im HTML vorhanden ist.
  }

  const year = currentCalendarDate.getFullYear(); // Aktuelles Kalenderjahr.
  const month = currentCalendarDate.getMonth(); // Aktueller Kalendermonat, 0 bis 11.
  const monthName = currentCalendarDate.toLocaleDateString("de-DE", { // Formatiert Monat und Jahr lesbar.
    month: "long", // Monatsname ausgeschrieben.
    year: "numeric" // Jahr als Zahl.
  });
  const firstDay = new Date(year, month, 1); // Erster Tag des Monats.
  const startOffset = (firstDay.getDay() + 6) % 7; // Verschiebt Sonntag-Samstag auf Montag-Sonntag.
  const startDate = new Date(year, month, 1 - startOffset); // Erster angezeigter Kalendertag.

  calendarTitle.innerText = monthName; // Setzt die Kalenderüberschrift.
  calendarGrid.innerHTML = ""; // Entfernt alte Kalendertage.

  for (let index = 0; index < 42; index += 1) { // Erstellt immer 6 Wochen mit je 7 Tagen.
    const date = new Date(startDate); // Kopiert den Starttag.
    date.setDate(startDate.getDate() + index); // Berechnet den Tag an dieser Rasterposition.

    const day = document.createElement("div"); // Erstellt eine Tageszelle.
    day.className = "calendar-day"; // Gibt der Zelle das Kalender-Styling.
    if (date.getMonth() !== month) { // Prüft, ob der Tag außerhalb des aktuellen Monats liegt.
      day.classList.add("muted"); // Markiert Tage aus Nachbar-Monaten optisch abgeschwächt.
    }

    day.innerHTML = `<div class="calendar-date">${date.getDate()}</div>`; // Schreibt die Tagesnummer in die Zelle.
    getPriorityGroupsForDate(toIsoDate(date)).forEach((group) => { // Holt Aufgaben-Gruppen für diesen Tag.
      const marker = document.createElement("button"); // Erstellt den farbigen Kalenderbalken.
      marker.type = "button"; // Verhindert Formularverhalten bei Buttons.
      const continuesLeft = index % 7 !== 0 && hasPriorityOnDate(toIsoDate(addDays(date, -1)), group.priority); // Prüft Verbindung zum Vortag.
      const continuesRight = index % 7 !== 6 && hasPriorityOnDate(toIsoDate(addDays(date, 1)), group.priority); // Prüft Verbindung zum Folgetag.
      marker.className = `calendar-marker ${priorityColors[group.priority] || priorityColors[1]}`; // Setzt Basis- und Prioritätsklasse.
      marker.classList.toggle("continues-left", continuesLeft); // Rundet links nicht ab, wenn der Balken weiterläuft.
      marker.classList.toggle("continues-right", continuesRight); // Rundet rechts nicht ab, wenn der Balken weiterläuft.
      marker.innerText = continuesLeft ? "" : group.tasks.length > 1 // Schreibt Text nur am Anfang eines Balkens.
        ? `Prioritaet ${group.priority} ${group.tasks.length}x` // Text für mehrere Aufgaben gleicher Priorität.
        : `Prioritaet ${group.priority}`; // Text für eine Aufgabe.
      marker.title = group.tasks.length > 1 // Tooltip für den Marker.
        ? `Prioritaet ${group.priority} ${group.tasks.length}x` // Tooltip bei mehreren Aufgaben.
        : `Prioritaet ${group.priority}`; // Tooltip bei einer Aufgabe.
      marker.onclick = function(event) { // Reagiert auf Klick auf den Marker.
        event.stopPropagation(); // Verhindert, dass der Klick an die Tageszelle weitergereicht wird.
        openCalendarTaskModal(group.tasks); // Öffnet den Dialog mit den passenden Aufgaben.
      };
      day.appendChild(marker); // Fügt den Marker in den Kalendertag ein.
    });

    calendarGrid.appendChild(day); // Fügt den Tag in den Kalender ein.
  }
}

function hasPriorityOnDate(isoDate, priority) { // Prüft, ob an einem Datum eine Aufgabe mit dieser Priorität liegt.
  return allTasks.some((task) => // Gibt true zurück, sobald eine passende Aufgabe gefunden wird.
    String(task.priority || "1") === String(priority) && // Priorität muss passen.
    task.created && // Aufgabe braucht ein Startdatum.
    task.deadline && // Aufgabe braucht ein Ablaufdatum.
    isDateInTaskRange(isoDate, task) // Datum muss im Aufgabenzeitraum liegen.
  );
}

function getPriorityGroupsForDate(isoDate) { // Gruppiert Aufgaben eines Tages nach Priorität.
  const groups = {}; // Objekt für Gruppen, z. B. groups[5] = Aufgaben mit Priorität 5.

  allTasks.forEach((task) => { // Geht alle Aufgaben durch.
    if (!task.created || !task.deadline || !isDateInTaskRange(isoDate, task)) { // Ignoriert Aufgaben ohne passenden Zeitraum.
      return; // Springt zur nächsten Aufgabe.
    }

    const priority = task.priority || "1"; // Nutzt Priorität 1 als Standard.
    groups[priority] = groups[priority] || []; // Erstellt die Gruppe, falls sie noch nicht existiert.
    groups[priority].push(task); // Fügt die Aufgabe zur passenden Prioritätsgruppe hinzu.
  });

  return Object.keys(groups) // Holt alle vorhandenen Prioritäten.
    .sort((a, b) => Number(b) - Number(a)) // Sortiert hohe Prioritäten zuerst.
    .map((priority) => ({ // Wandelt jede Gruppe in ein einheitliches Objekt um.
      priority, // Prioritätswert.
      tasks: groups[priority] // Aufgaben dieser Priorität.
    }));
}

function openCalendarTaskModal(tasks) { // Öffnet einen Dialog mit Aufgaben aus dem Kalender.
  const title = document.getElementById("calendarTaskTitle"); // Überschrift des Dialogs.
  const details = document.getElementById("calendarTaskDetails"); // Container für die Aufgabenlinks.
  title.innerText = tasks.length > 1 ? "Tasks im Kalender" : "Task im Kalender"; // Passt Singular/Plural an.
  details.innerHTML = ""; // Entfernt alte Inhalte.

  tasks.forEach((task) => { // Erstellt für jede Aufgabe einen klickbaren Eintrag.
    const item = document.createElement("button"); // Button, damit der Eintrag anklickbar ist.
    item.type = "button"; // Verhindert Formularverhalten.
    item.className = "calendar-task-link"; // Setzt das Styling für Kalender-Aufgabenlinks.
    item.innerHTML = `
      <strong>#${task.ticketNumber} ${escapeHtml(task.title)}</strong>
      <span>
        ${escapeHtml(task.summary || "Keine Zusammenfassung")}<br>
        Prioritaet ${escapeHtml(task.priority || "Offen")} -
        ${escapeHtml(formatDisplayDate(task.created) || "Offen")} bis
        ${escapeHtml(formatDisplayDate(task.deadline) || "Offen")}
      </span>
    `; // Zeigt Titel, Beschreibung, Priorität und Zeitraum sicher escaped an.
    item.onclick = function() { // Reagiert auf Klick auf den Kalendereintrag.
      goToTask(task.id); // Springt zur passenden Aufgabenkarte.
    };
    details.appendChild(item); // Fügt den Eintrag in den Dialog ein.
  });

  document.getElementById("calendarTaskModal").style.display = "flex"; // Zeigt den Kalenderdialog.
}

function closeCalendarTaskModal() { // Schließt den Kalenderdialog.
  document.getElementById("calendarTaskModal").style.display = "none"; // Versteckt den Kalenderdialog.
}

function goToTask(taskId) { // Springt von einem Kalendereintrag zur Aufgabe in der Liste.
  const task = allTasks.find((item) => String(item.id) === String(taskId)); // Sucht die Aufgabe anhand der ID.
  const card = document.querySelector(`[data-task-id="${String(taskId)}"]`); // Sucht die passende Aufgabenkarte im HTML.

  if (!task || !card) { // Prüft, ob Aufgabe und Karte gefunden wurden.
    return; // Bricht ab, wenn etwas fehlt.
  }

  closeCalendarTaskModal(); // Schließt den Kalenderdialog.
  closeDetailModal(); // Schließt eine eventuell offene Detailansicht.
  card.scrollIntoView({ behavior: "smooth", block: "center" }); // Scrollt die Karte in die Bildschirmmitte.
  document.querySelectorAll(".task-card.focused").forEach((item) => item.classList.remove("focused")); // Entfernt alte Hervorhebungen.
  card.classList.add("focused"); // Hebt die gefundene Karte hervor.
  setTimeout(() => card.classList.remove("focused"), 2200); // Entfernt die Hervorhebung nach kurzer Zeit.
  openDetailModal(card, task); // Öffnet direkt die Detailansicht.
}

function openNotifications() { // Öffnet den Benachrichtigungsdialog.
  const list = document.getElementById("notificationList"); // Container für Benachrichtigungen.
  list.innerHTML = ""; // Entfernt alte Listeneinträge.

  if (notifications.length === 0) { // Prüft, ob Benachrichtigungen vorhanden sind.
    list.innerHTML = '<p class="task-summary">Keine Benachrichtigungen vorhanden.</p>'; // Zeigt Ersatztext.
  } else { // Es gibt Benachrichtigungen.
    notifications.forEach((notification) => { // Erstellt für jede Benachrichtigung ein Element.
      const item = document.createElement("div"); // Neues Benachrichtigungselement.
      item.className = "notification-item"; // Setzt das Styling.
      item.innerHTML = `
        <strong>${escapeHtml(notification.title)}</strong>
        <span>${escapeHtml(notification.time)}</span>
      `; // Zeigt Titel und Zeitpunkt sicher escaped an.
      list.appendChild(item); // Fügt die Benachrichtigung ein.
    });
  }

  unreadNotificationCount = 0; // Beim Öffnen gelten alle Benachrichtigungen als gelesen.
  updateNotificationBadge(); // Aktualisiert den roten Zähler.
  document.getElementById("notificationModal").style.display = "flex"; // Zeigt den Dialog.
}

function closeNotifications() { // Schließt den Benachrichtigungsdialog.
  document.getElementById("notificationModal").style.display = "none"; // Versteckt den Dialog.
}

function addNotification(action, task) { // Fügt eine neue Benachrichtigung hinzu.
  notifications.unshift({ // Neue Meldungen stehen vorne in der Liste.
    title: `${action}: #${task.ticketNumber} ${task.title}`, // Titel mit Aktion und Ticketnummer.
    time: new Date().toLocaleString("de-DE") // Zeitpunkt der Meldung.
  });
  unreadNotificationCount += 1; // Erhöht den Zähler ungelesener Meldungen.
  updateNotificationBadge(); // Aktualisiert die Anzeige im Header.
}

function addTaskHistory(task, action) { // Fügt einen Historieneintrag zu einer Aufgabe hinzu.
  task.history = task.history || []; // Stellt sicher, dass eine Historienliste existiert.
  task.history.unshift({ // Neuer Eintrag kommt nach oben.
    action, // Beschreibung der Aktion.
    time: new Date().toLocaleString("de-DE") // Zeitpunkt der Aktion.
  });
}

function addDueSoonNotifications() { // Erstellt Warnungen für bald fällige Aufgaben.
  allTasks.forEach((task) => { // Prüft jede Aufgabe.
    if (!task.deadline) { // Ohne Ablaufdatum kann keine Fälligkeit berechnet werden.
      return; // Springt zur nächsten Aufgabe.
    }

    const daysLeft = getDaysUntil(task.deadline); // Berechnet Tage bis zum Ablaufdatum.
    const alreadyExists = notifications.some((notification) => // Prüft, ob diese Warnung schon existiert.
      notification.title.includes(`#${task.ticketNumber}`) && // Gleiche Ticketnummer.
      notification.title.includes("Kurz vor Ablauf") // Gleicher Warnungstyp.
    );

    if (daysLeft >= 0 && daysLeft <= 2 && !alreadyExists) { // Warnt nur für heute, morgen oder übermorgen.
      notifications.unshift({ // Fügt die Warnung vorne ein.
        title: `Kurz vor Ablauf: #${task.ticketNumber} ${task.title}`, // Titel der Warnung.
        time: `Faellig in ${daysLeft} Tag(en)` // Zeigt die verbleibenden Tage.
      });
      unreadNotificationCount += 1; // Erhöht den Zähler ungelesener Meldungen.
    }
  });

  updateNotificationBadge(); // Aktualisiert den roten Zähler.
}

function updateNotificationBadge() { // Aktualisiert den roten Benachrichtigungszähler.
  const badge = document.getElementById("notificationBadge"); // Holt das Badge-Element.
  if (!badge) { // Falls das Badge im HTML fehlt.
    return; // Bricht ab.
  }

  badge.innerText = String(unreadNotificationCount); // Schreibt die aktuelle Anzahl ins Badge.
  badge.style.display = unreadNotificationCount > 0 ? "inline-flex" : "none"; // Zeigt das Badge nur bei ungelesenen Meldungen.
}

function isDateRangeValid(created, deadline) { // Prüft, ob das Ablaufdatum nicht vor dem Startdatum liegt.
  if (!created || !deadline) { // Wenn eines der Daten fehlt, kann kein Konflikt entstehen.
    return true; // Datumsspanne ist erlaubt.
  }

  return new Date(deadline) >= new Date(created); // Ablaufdatum muss gleich oder nach Erstelldatum sein.
}

function updateDeadlineMinimum() { // Setzt die Mindestgrenze für das Ablaufdatum.
  const createdInput = document.getElementById("taskCreated"); // Feld für das Erstelldatum.
  const deadlineInput = document.getElementById("taskDeadline"); // Feld für das Ablaufdatum.

  if (!createdInput || !deadlineInput) { // Prüft, ob beide Felder existieren.
    return; // Bricht ab, wenn ein Feld fehlt.
  }

  deadlineInput.min = createdInput.value || ""; // Ablaufdatum darf nicht vor dem Erstelldatum liegen.

  if (createdInput.value && deadlineInput.value && deadlineInput.value < createdInput.value) { // Prüft eine ungültige Datumskombination.
    deadlineInput.setCustomValidity("Das Ablaufdatum darf nicht vor dem Erstelldatum liegen."); // Setzt Browser-Validierung.
  } else { // Datumskombination ist gültig oder unvollständig.
    deadlineInput.setCustomValidity(""); // Entfernt die Fehlermeldung.
  }
}

function isDateInTaskRange(isoDate, task) { // Prüft, ob ein Datum im Zeitraum einer Aufgabe liegt.
  const date = new Date(isoDate); // Wandelt das Prüfdatum in ein Date-Objekt um.
  const created = new Date(task.created); // Wandelt das Startdatum in ein Date-Objekt um.
  const deadline = new Date(task.deadline); // Wandelt das Ablaufdatum in ein Date-Objekt um.
  return date >= created && date <= deadline; // Datum muss zwischen Start und Ablauf liegen.
}

function getDaysUntil(isoDate) { // Berechnet die Tage bis zu einem Datum.
  const today = new Date(); // Aktuelles Datum.
  today.setHours(0, 0, 0, 0); // Entfernt Uhrzeit, damit nur Tage verglichen werden.
  const target = new Date(isoDate); // Zieldatum.
  target.setHours(0, 0, 0, 0); // Entfernt Uhrzeit vom Zieldatum.
  return Math.ceil((target - today) / 86400000); // Millisekunden werden in Tage umgerechnet.
}

function getNextTicketNumber() { // Bestimmt die nächste freie Ticketnummer.
  if (allTasks.length === 0) { // Keine Aufgaben vorhanden.
    return 1; // Erste Ticketnummer ist 1.
  }

  return Math.max(...allTasks.map((task) => Number(task.ticketNumber) || 0)) + 1; // Höchste Nummer plus eins.
}

function createLocalId() { // Erstellt eine lokale eindeutige ID.
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`; // Kombiniert Zeitstempel und Zufallswert.
}

function normalizeDate(dateString) { // Vereinheitlicht Datumswerte für Formularfelder.
  if (!dateString || dateString === "Offen") { // Leere oder offene Daten werden leer gespeichert.
    return ""; // Leerer Wert für date-inputs.
  }

  if (dateString.includes(".")) { // Erkennt deutsche Datumswerte wie 01.02.2026.
    return toInputDate(dateString); // Wandelt deutsches Datum in yyyy-mm-dd um.
  }

  return dateString; // ISO-Datum kann direkt genutzt werden.
}

function toInputDate(dateString) { // Wandelt dd.mm.yyyy in yyyy-mm-dd um.
  if (!dateString || !dateString.includes(".")) { // Prüft, ob ein deutsches Datum vorliegt.
    return ""; // Kein verwertbares Datum.
  }

  const [day, month, year] = dateString.split("."); // Zerlegt Tag, Monat und Jahr.
  return `${year}-${month}-${day}`; // Baut das Format für input[type=date].
}

function fromInputDate(dateString) { // Wandelt yyyy-mm-dd in dd.mm.yyyy um.
  if (!dateString) { // Kein Datum vorhanden.
    return "Offen"; // Ersatztext für fehlende Daten.
  }

  const [year, month, day] = dateString.split("-"); // Zerlegt Jahr, Monat und Tag.
  return `${day}.${month}.${year}`; // Baut das deutsche Anzeigeformat.
}

function formatDisplayDate(dateString) { // Bereitet ein Datum für die Anzeige auf.
  if (!dateString) { // Kein Datum vorhanden.
    return ""; // Gibt leeren Text zurück.
  }

  if (dateString.includes(".")) { // Datum ist bereits im deutschen Format.
    return dateString; // Gibt es unverändert zurück.
  }

  const [year, month, day] = dateString.split("-"); // Zerlegt ISO-Datum.

  if (!year || !month || !day) { // Prüft, ob das Datum unvollständig ist.
    return dateString; // Gibt unbekanntes Format unverändert zurück.
  }

  return `${day}.${month}.${year}`; // Gibt deutsches Anzeigeformat zurück.
}

function toIsoDate(date) { // Wandelt ein Date-Objekt in yyyy-mm-dd um.
  const year = date.getFullYear(); // Jahr des Datums.
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Monat, zweistellig.
  const day = String(date.getDate()).padStart(2, "0"); // Tag, zweistellig.
  return `${year}-${month}-${day}`; // ISO-Format für Vergleiche und input-Felder.
}

function addDays(date, amount) { // Addiert Tage zu einem Datum.
  const copy = new Date(date); // Kopiert das Datum, damit das Original unverändert bleibt.
  copy.setDate(copy.getDate() + amount); // Verschiebt die Kopie um die angegebene Tagesanzahl.
  return copy; // Gibt das neue Datum zurück.
}

function escapeHtml(value) { // Macht Text sicher, bevor er in innerHTML eingesetzt wird.
  return String(value) // Wandelt den Wert zuerst in Text um.
    .replaceAll("&", "&amp;") // Escaped kaufmännisches Und.
    .replaceAll("<", "&lt;") // Escaped öffnende HTML-Klammer.
    .replaceAll(">", "&gt;") // Escaped schließende HTML-Klammer.
    .replaceAll('"', "&quot;") // Escaped doppelte Anführungszeichen.
    .replaceAll("'", "&#039;"); // Escaped einfache Anführungszeichen.
}

window.onclick = function(event) { // Reagiert auf Klicks im Fenster.
  const detailModal = document.getElementById("detailModal"); // Detaildialog.
  const createModal = document.getElementById("createModal"); // Formulardialog.
  const calendarTaskModal = document.getElementById("calendarTaskModal"); // Kalenderdialog.
  const notificationModal = document.getElementById("notificationModal"); // Benachrichtigungsdialog.

  if (event.target === detailModal) { // Klick auf den dunklen Hintergrund des Detaildialogs.
    closeDetailModal(); // Schließt den Detaildialog.
  }

  if (event.target === createModal) { // Klick auf den dunklen Hintergrund des Formulardialogs.
    closeCreateModal(); // Schließt den Formulardialog.
  }

  if (event.target === calendarTaskModal) { // Klick auf den dunklen Hintergrund des Kalenderdialogs.
    closeCalendarTaskModal(); // Schließt den Kalenderdialog.
  }

  if (event.target === notificationModal) { // Klick auf den dunklen Hintergrund des Benachrichtigungsdialogs.
    closeNotifications(); // Schließt den Benachrichtigungsdialog.
  }
};

document.getElementById("taskCreated").addEventListener("change", updateDeadlineMinimum); // Aktualisiert Datumslimit, wenn das Erstelldatum geändert wird.
document.getElementById("taskDeadline").addEventListener("change", updateDeadlineMinimum); // Aktualisiert Validierung, wenn das Ablaufdatum geändert wird.
document.addEventListener("DOMContentLoaded", loadTasksFromBackend); // Lädt Aufgaben, sobald das HTML vollständig geladen ist.

// Helper: aktuellen Wert des "Bearbeitet" Feldes aus dem Formular lesen
function getFormEditedValue() {
  const checked = document.querySelector('input[name="taskEdited"]:checked');
  return checked ? (checked.value === 'yes') : false;
}

// Helper: Radios im Formular für Edit setzen
function setFormEditedRadios(value) {
  const yes = document.getElementById('taskEditedYes');
  const no = document.getElementById('taskEditedNo');
  if (yes && no) {
    yes.checked = !!value;
    no.checked = !value;
  }
}

// Wenn ein Task ins Bearbeitungsformular geladen wird: Radios setzen
function populateFormForEdit(task) {
  // Beispielhafte Zuweisungen (falls andere Felder bereits gesetzt werden, bleibt das kompatibel)
  if (document.getElementById('taskTitle')) document.getElementById('taskTitle').value = task.title || '';
  if (document.getElementById('taskSummary')) document.getElementById('taskSummary').value = task.summary || '';
  if (document.getElementById('taskPriority')) document.getElementById('taskPriority').value = task.priority || '1';
  if (document.getElementById('taskCreated')) document.getElementById('taskCreated').value = task.created || '';
  if (document.getElementById('taskCreator')) document.getElementById('taskCreator').value = task.creator || '';
  if (document.getElementById('taskDeadline')) document.getElementById('taskDeadline').value = task.deadline || '';

  // Setze die Radios für "Bearbeitet"
  setFormEditedRadios(task.checked);
}

// Beim Absenden des Formulars: 'checked' mit in die Task-Daten aufnehmen
// Falls bereits ein submit-Handler existiert, ergänze dort die Zeile `checked: getFormEditedValue()`
// Hier ein vollständiger Handler-Fallback / Ergänzung:
const taskForm = document.getElementById('taskForm');
if (taskForm) {
  taskForm.addEventListener('submit', async (e) => {
    // Wenn ein anderer Handler bereits e.preventDefault macht, wird das nicht doppelt störend sein.
    e.preventDefault();

    // ...existing code to collect other fields...
    const taskData = {
      title: document.getElementById('taskTitle')?.value || '',
      summary: document.getElementById('taskSummary')?.value || '',
      priority: Number(document.getElementById('taskPriority')?.value || 1),
      created: document.getElementById('taskCreated')?.value || null,
      creator: document.getElementById('taskCreator')?.value || null,
      deadline: document.getElementById('taskDeadline')?.value || null,
      checked: getFormEditedValue() // <-- neues Feld
    };

    // ...existing code to send taskData to backend or update UI ...
    // Beispiel: fetch(API_URL + '/save_task', { method:'POST', body: JSON.stringify(taskData), headers:{'Content-Type':'application/json'} })
    // Danach Modal schließen und Liste neu laden / UI aktualisieren.
    if (typeof submitTaskData === 'function') {
      // wenn es eine helper-Funktion gibt, benutze sie
      submitTaskData(taskData);
    } else {
      console.debug('taskForm submit (fallback) payload:', taskData);
      // Fallback: schließe Modal und reload tasks, wenn vorhandene Funktionen existieren
      if (typeof closeCreateModal === 'function') closeCreateModal();
      if (typeof loadTasksFromBackend === 'function') loadTasksFromBackend();
    }
  });
}

// Beim Anzeigen der Task-Details: Bearbeitet anzeigen
function showTaskDetails(task) {
  // ...existing code that sets detailTitle, detailSummary, etc. ...
  if (document.getElementById('detailTitle')) document.getElementById('detailTitle').textContent = task.title || '';
  if (document.getElementById('detailSummary')) document.getElementById('detailSummary').textContent = task.summary || '';
  if (document.getElementById('detailPriority')) document.getElementById('detailPriority').textContent = task.priority || '';
  if (document.getElementById('detailCreated')) document.getElementById('detailCreated').textContent = task.created || '';
  if (document.getElementById('detailCreator')) document.getElementById('detailCreator').textContent = task.creator || '';
  if (document.getElementById('detailDeadline')) document.getElementById('detailDeadline').textContent = task.deadline || '';

  const editedText = task.checked ? 'Ja' : 'Nein';
  const detailEditedEl = document.getElementById('detailEdited');
  if (detailEditedEl) detailEditedEl.textContent = editedText;

  // ...existing code to fill history and actions ...
}
