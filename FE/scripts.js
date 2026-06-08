const API_URL = "http://127.0.0.1:8000"; // Adresse des lokalen Backends.
const priorityColors = { // Verknuepft Prioritaeten mit CSS-Klassen fuer Kalenderfarben.
  1: "priority-color-1", // Farbe fuer Prioritaet 1.
  2: "priority-color-2", // Farbe fuer Prioritaet 2.
  3: "priority-color-3", // Farbe fuer Prioritaet 3.
  4: "priority-color-4", // Farbe fuer Prioritaet 4.
  5: "priority-color-5" // Farbe fuer Prioritaet 5.
};

let selectedTaskCard = null; // Speichert die aktuell angeklickte Aufgabenkarte.
let currentTask = null; // Speichert die aktuell ausgewaehlte Aufgabe.
let editingTaskCard = null; // Ist gesetzt, wenn gerade eine bestehende Aufgabe bearbeitet wird.
let allTasks = []; // Enthaelt alle Aufgaben, die in der UI angezeigt werden.
let notifications = []; // Enthaelt alle Benachrichtigungen.
let unreadNotificationCount = 0; // Anzahl der ungelesenen Benachrichtigungen.
let currentCalendarDate = new Date(); // Monat und Jahr, die der Kalender gerade zeigt.

async function loadTasksFromBackend() { // Laedt Aufgaben beim Start aus dem Backend.
  const taskList = document.getElementById("taskList"); // Container, in dem die Aufgaben angezeigt werden.

  try { // Versucht, die Daten vom Backend zu holen.
    const response = await fetch(`${API_URL}/get_tasks`); // Sendet eine GET-Anfrage an die Backend-Route.

    if (!response.ok) { // Prueft, ob die Antwort erfolgreich war.
      throw new Error(`API-Fehler: ${response.status}`); // Gibt den Fehlerstatus weiter.
    }

    const tasks = await response.json(); // Wandelt die JSON-Antwort in JavaScript-Daten um.
    allTasks = tasks.map((apiTask, index) => mapApiTask(apiTask, index + 1)); // Formatiert jede Backend-Aufgabe fuer die UI.
    renderTasks(); // Zeichnet die Aufgabenliste neu.
    addDueSoonNotifications(); // Erstellt Hinweise fuer bald faellige Aufgaben.
    renderCalendar(); // Zeichnet den Kalender mit den geladenen Aufgaben.
  } catch (error) { // Wird ausgefuehrt, wenn Backend oder Netzwerk nicht erreichbar sind.
    console.error(error); // Schreibt den technischen Fehler in die Browser-Konsole.
    taskList.innerHTML = `
      <p class="task-summary">
        Aufgaben konnten nicht aus main.py geladen werden. Starte das Backend mit:
        uvicorn main:app --reload
      </p>
    `; // Zeigt dem Benutzer eine hilfreiche Fehlermeldung an.
  }
}

function mapApiTask(apiTask, ticketNumber) { // Wandelt eine Backend-Aufgabe in das Format der Oberflaeche um.
  return {
    id: apiTask.id || createLocalId(), // Nutzt die Backend-ID oder erstellt lokal eine Ersatz-ID.
    ticketNumber, // Laufende Nummer fuer die Anzeige.
    title: apiTask.title, // Titel aus dem Backend.
    summary: apiTask.conclusion || "", // Beschreibung aus dem Backend oder leerer Text.
    priority: String(apiTask.Priority || ""), // Prioritaet als String, passend zum Formularwert.
    created: normalizeDate(apiTask.Date), // Erstelldatum im Eingabeformat yyyy-mm-dd.
    creator: apiTask.User_Name || "", // Name des Erstellers.
    deadline: normalizeDate(apiTask.Expire_Date), // Ablaufdatum im Eingabeformat yyyy-mm-dd.
    history: [ // Startet die Historie mit einem Ladeeintrag.
      {
        action: "Aus Backend geladen", // Text des Historieneintrags.
        time: new Date().toLocaleString("de-DE") // Zeitpunkt im deutschen Datumsformat.
      }
    ]
  };
}

function renderTasks() { // Baut die Aufgabenliste aus allTasks komplett neu auf.
  const taskList = document.getElementById("taskList"); // Holt den Aufgabencontainer.
  taskList.innerHTML = ""; // Entfernt alte Karten, damit keine Duplikate entstehen.

  allTasks.forEach((task) => { // Geht alle Aufgaben durch.
    taskList.appendChild(createTaskCard(task)); // Erstellt und fuegt eine Aufgabenkarte ein.
  });
}

function openDetailModal(card, task) { // Oeffnet die Detailansicht fuer eine Aufgabe.
  selectedTaskCard = card; // Merkt sich die geklickte Karte.
  currentTask = task; // Merkt sich die angezeigte Aufgabe.

  document.getElementById("detailTitle").innerText = task.title; // Setzt den Titel im Detaildialog.
  document.getElementById("detailSummary").innerText = task.summary; // Setzt die Zusammenfassung im Detaildialog.
  document.getElementById("detailPriority").innerText = task.priority || "Offen"; // Setzt die Prioritaet oder einen Ersatztext.
  document.getElementById("detailCreated").innerText = formatDisplayDate(task.created); // Zeigt das Erstelldatum lesbar an.
  document.getElementById("detailCreator").innerText = task.creator || "Unbekannt"; // Zeigt den Ersteller oder einen Ersatztext an.
  document.getElementById("detailDeadline").innerText = formatDisplayDate(task.deadline) || "Offen"; // Zeigt das Ablaufdatum lesbar an.
  renderTaskHistory(task); // Fuegt die Historie der Aufgabe ein.

  document.getElementById("detailModal").style.display = "flex"; // Macht den Detaildialog sichtbar.
}

function closeDetailModal() { // Schliesst die Detailansicht.
  document.getElementById("detailModal").style.display = "none"; // Versteckt den Detaildialog.
}

function renderTaskHistory(task) { // Zeigt die Historie einer Aufgabe im Detaildialog.
  const historyContainer = document.getElementById("detailHistory"); // Container fuer Historieneintraege.
  const history = task.history || []; // Nutzt eine leere Liste, wenn keine Historie existiert.

  historyContainer.innerHTML = ""; // Entfernt alte Historieneintraege.

  if (history.length === 0) { // Prueft, ob es ueberhaupt Historieneintraege gibt.
    historyContainer.innerHTML = "<span>Noch keine Aenderungen vorhanden.</span>"; // Zeigt einen Ersatztext.
    return; // Beendet die Funktion, weil nichts weiter gerendert werden muss.
  }

  history.forEach((entry) => { // Erstellt fuer jeden Historieneintrag ein Element.
    const item = document.createElement("div"); // Erstellt ein neues HTML-Element.
    item.innerHTML = `
      <strong>${escapeHtml(entry.action)}</strong>
      <span>${escapeHtml(entry.time)}</span>
    `; // Setzt Aktion und Zeitpunkt; escapeHtml verhindert unsicheren HTML-Code.
    historyContainer.appendChild(item); // Fuegt den Eintrag in den Dialog ein.
  });
}

function openCreateModal() { // Oeffnet das Formular fuer eine neue Aufgabe.
  editingTaskCard = null; // Deaktiviert den Bearbeiten-Modus.
  currentTask = null; // Entfernt eine eventuell vorher ausgewaehlte Aufgabe.
  document.getElementById("formTitle").innerText = "Neue Aufgabe erstellen"; // Setzt die Formularueberschrift.
  document.querySelector(".save-btn").innerText = "Aufgabe speichern"; // Setzt den Buttontext fuer neue Aufgaben.
  document.getElementById("taskForm").reset(); // Leert alle Formularfelder.
  updateDeadlineMinimum(); // Aktualisiert die Datumspruefung.
  document.getElementById("createModal").style.display = "flex"; // Zeigt den Formulardialog.
}

function closeCreateModal() { // Schliesst den Formulardialog.
  document.getElementById("createModal").style.display = "none"; // Versteckt das Formular.
}

function openEditModal() { // Oeffnet das Formular zum Bearbeiten der aktuellen Aufgabe.
  if (!currentTask || !selectedTaskCard) { // Ohne ausgewaehlte Aufgabe kann nichts bearbeitet werden.
    return; // Bricht ab.
  }

  editingTaskCard = selectedTaskCard; // Markiert, dass beim Speichern eine vorhandene Aufgabe ersetzt wird.
  document.getElementById("formTitle").innerText = "Aufgabe bearbeiten"; // Setzt die Formularueberschrift.
  document.querySelector(".save-btn").innerText = "Aenderungen speichern"; // Setzt den Buttontext fuer Bearbeitung.
  document.getElementById("taskTitle").value = currentTask.title; // Fuellt den Titel ins Formular.
  document.getElementById("taskSummary").value = currentTask.summary; // Fuellt die Zusammenfassung ins Formular.
  document.getElementById("taskPriority").value = currentTask.priority; // Fuellt die Prioritaet ins Formular.
  document.getElementById("taskCreated").value = currentTask.created; // Fuellt das Erstelldatum ins Formular.
  document.getElementById("taskCreator").value = currentTask.creator; // Fuellt den Ersteller ins Formular.
  document.getElementById("taskDeadline").value = currentTask.deadline; // Fuellt das Ablaufdatum ins Formular.
  updateDeadlineMinimum(); // Setzt das erlaubte Mindestdatum fuer das Ablaufdatum.

  closeDetailModal(); // Schliesst die Detailansicht.
  document.getElementById("createModal").style.display = "flex"; // Oeffnet das Formular.
}

function deleteCurrentTask() { // Loescht die aktuell ausgewaehlte Aufgabe aus der Oberflaeche.
  if (!selectedTaskCard || !currentTask) { // Prueft, ob eine Aufgabe ausgewaehlt ist.
    return; // Bricht ab, wenn keine Aufgabe vorhanden ist.
  }

  const shouldDelete = confirm(`Soll die Aufgabe "${currentTask.title}" wirklich geloescht werden?`); // Sicherheitsabfrage vor dem Loeschen.

  if (!shouldDelete) { // Benutzer hat abgebrochen.
    return; // Loescht nichts.
  }

  allTasks = allTasks.filter((task) => task.id !== currentTask.id); // Entfernt die Aufgabe aus dem lokalen Array.
  addNotification("Geloescht", currentTask); // Erstellt eine Benachrichtigung.
  selectedTaskCard = null; // Loescht die aktuelle Karten-Auswahl.
  currentTask = null; // Loescht die aktuelle Aufgaben-Auswahl.
  closeDetailModal(); // Schliesst die Detailansicht.
  renderTasks(); // Aktualisiert die Aufgabenliste.
  renderCalendar(); // Aktualisiert den Kalender.
}

document.getElementById("taskForm").addEventListener("submit", function(event) { // Reagiert auf das Absenden des Formulars.
  event.preventDefault(); // Verhindert das Neuladen der Seite.

  const task = { // Sammelt alle Formularwerte in einem Aufgabenobjekt.
    id: currentTask?.id || createLocalId(), // Behaelt vorhandene ID oder erstellt eine neue lokale ID.
    ticketNumber: currentTask?.ticketNumber || getNextTicketNumber(), // Behaelt vorhandene Ticketnummer oder vergibt die naechste.
    title: document.getElementById("taskTitle").value.trim(), // Liest den Titel ohne Leerzeichen am Rand.
    summary: document.getElementById("taskSummary").value.trim(), // Liest die Zusammenfassung ohne Leerzeichen am Rand.
    priority: document.getElementById("taskPriority").value, // Liest die ausgewaehlte Prioritaet.
    created: document.getElementById("taskCreated").value, // Liest das Erstelldatum.
    creator: document.getElementById("taskCreator").value.trim(), // Liest den Ersteller ohne Leerzeichen am Rand.
    deadline: document.getElementById("taskDeadline").value, // Liest das Ablaufdatum.
    history: currentTask?.history ? [...currentTask.history] : [] // Uebernimmt vorhandene Historie oder startet leer.
  };

  if (!isDateRangeValid(task.created, task.deadline)) { // Prueft, ob das Ablaufdatum nach dem Erstelldatum liegt.
    alert("Das Ablaufdatum darf nicht vor dem Erstelldatum liegen."); // Zeigt eine Warnung.
    return; // Speichert die Aufgabe nicht.
  }

  if (editingTaskCard) { // Bearbeiten-Modus: vorhandene Aufgabe aktualisieren.
    const taskIndex = allTasks.findIndex((item) => item.id === task.id); // Sucht die Aufgabe im Array.
    if (taskIndex !== -1) { // Prueft, ob die Aufgabe gefunden wurde.
      addTaskHistory(task, "Ticket bearbeitet"); // Fuegt einen Historieneintrag hinzu.
      allTasks[taskIndex] = task; // Ersetzt die alte Aufgabe.
    }
    addNotification("Bearbeitet", task); // Erstellt eine Bearbeiten-Benachrichtigung.
  } else { // Erstellen-Modus: neue Aufgabe hinzufuegen.
    addTaskHistory(task, "Ticket hinzugefuegt"); // Fuegt einen Historieneintrag hinzu.
    allTasks.push(task); // Speichert die neue Aufgabe lokal.
    addNotification("Hinzugefuegt", task); // Erstellt eine Hinzufuegen-Benachrichtigung.
  }

  closeCreateModal(); // Schliesst das Formular.
  event.target.reset(); // Leert das Formular.
  editingTaskCard = null; // Beendet den Bearbeiten-Modus.
  currentTask = null; // Entfernt die aktuelle Aufgaben-Auswahl.
  renderTasks(); // Aktualisiert die Aufgabenliste.
  renderCalendar(); // Aktualisiert den Kalender.
  addDueSoonNotifications(); // Prueft auf neue Faelligkeitswarnungen.
});

function createTaskCard(task) { // Erstellt eine neue Aufgabenkarte.
  const card = document.createElement("div"); // Erzeugt ein div fuer die Karte.
  card.className = "task-card"; // Gibt der Karte das passende CSS-Styling.
  updateTaskCard(card, task); // Fuellt die Karte mit Aufgabendaten.
  return card; // Gibt die fertige Karte zurueck.
}

function updateTaskCard(card, task) { // Befuellt eine Aufgabenkarte mit Daten.
  card.dataset.taskId = String(task.id); // Speichert die ID im HTML, damit die Karte spaeter gefunden werden kann.
  card.onclick = function() { // Reagiert auf einen Klick auf die Karte.
    openDetailModal(card, task); // Oeffnet die Detailansicht dieser Aufgabe.
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
  `; // Erstellt die HTML-Struktur der Karte.

  card.querySelector(".task-title").innerText = `#${task.ticketNumber} ${task.title}`; // Setzt Ticketnummer und Titel.
  card.querySelector(".task-summary").innerText = task.summary; // Setzt die Zusammenfassung.
  card.querySelector(".priority").innerText = `Prioritaet: ${task.priority || "Offen"}`; // Setzt die Prioritaet.
  card.querySelector(".meta-pill").innerText = task.creator || "Unbekannt"; // Setzt den Ersteller.
  card.querySelector(".deadline-value").innerText = formatDisplayDate(task.deadline) || "Offen"; // Setzt das Ablaufdatum.
}

function toggleCalendar() { // Klappt den Kalender ein oder aus.
  const calendarPanel = document.getElementById("calendarPanel"); // Holt den Kalenderbereich.
  calendarPanel.style.display = calendarPanel.style.display === "block" ? "none" : "block"; // Wechselt zwischen sichtbar und unsichtbar.
  renderCalendar(); // Zeichnet den Kalender neu.
}

function changeCalendarMonth(direction) { // Wechselt den angezeigten Monat.
  currentCalendarDate = new Date( // Erstellt ein Datum fuer den neuen Monat.
    currentCalendarDate.getFullYear(), // Nutzt das aktuelle Kalenderjahr.
    currentCalendarDate.getMonth() + direction, // Addiert oder subtrahiert einen Monat.
    1 // Setzt den Tag auf den Monatsersten.
  );
  renderCalendar(); // Zeichnet den Kalender neu.
}

function renderCalendar() { // Baut die Monatsansicht des Kalenders.
  const calendarGrid = document.getElementById("calendarGrid"); // Container fuer Kalendertage.
  const calendarTitle = document.getElementById("calendarTitle"); // Ueberschrift fuer Monat und Jahr.

  if (!calendarGrid || !calendarTitle) { // Prueft, ob die Kalender-Elemente existieren.
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

  calendarTitle.innerText = monthName; // Setzt die Kalenderueberschrift.
  calendarGrid.innerHTML = ""; // Entfernt alte Kalendertage.

  for (let index = 0; index < 42; index += 1) { // Erstellt immer 6 Wochen mit je 7 Tagen.
    const date = new Date(startDate); // Kopiert den Starttag.
    date.setDate(startDate.getDate() + index); // Berechnet den Tag an dieser Rasterposition.

    const day = document.createElement("div"); // Erstellt eine Tageszelle.
    day.className = "calendar-day"; // Gibt der Zelle das Kalender-Styling.
    if (date.getMonth() !== month) { // Prueft, ob der Tag ausserhalb des aktuellen Monats liegt.
      day.classList.add("muted"); // Markiert Tage aus Nachbar-Monaten optisch abgeschwaecht.
    }

    day.innerHTML = `<div class="calendar-date">${date.getDate()}</div>`; // Schreibt die Tagesnummer in die Zelle.
    getPriorityGroupsForDate(toIsoDate(date)).forEach((group) => { // Holt Aufgaben-Gruppen fuer diesen Tag.
      const marker = document.createElement("button"); // Erstellt den farbigen Kalenderbalken.
      marker.type = "button"; // Verhindert Formularverhalten bei Buttons.
      const continuesLeft = index % 7 !== 0 && hasPriorityOnDate(toIsoDate(addDays(date, -1)), group.priority); // Prueft Verbindung zum Vortag.
      const continuesRight = index % 7 !== 6 && hasPriorityOnDate(toIsoDate(addDays(date, 1)), group.priority); // Prueft Verbindung zum Folgetag.
      marker.className = `calendar-marker ${priorityColors[group.priority] || priorityColors[1]}`; // Setzt Basis- und Prioritaetsklasse.
      marker.classList.toggle("continues-left", continuesLeft); // Rundet links nicht ab, wenn der Balken weiterlaeuft.
      marker.classList.toggle("continues-right", continuesRight); // Rundet rechts nicht ab, wenn der Balken weiterlaeuft.
      marker.innerText = continuesLeft ? "" : group.tasks.length > 1 // Schreibt Text nur am Anfang eines Balkens.
        ? `Prioritaet ${group.priority} ${group.tasks.length}x` // Text fuer mehrere Aufgaben gleicher Prioritaet.
        : `Prioritaet ${group.priority}`; // Text fuer eine Aufgabe.
      marker.title = group.tasks.length > 1 // Tooltip fuer den Marker.
        ? `Prioritaet ${group.priority} ${group.tasks.length}x` // Tooltip bei mehreren Aufgaben.
        : `Prioritaet ${group.priority}`; // Tooltip bei einer Aufgabe.
      marker.onclick = function(event) { // Reagiert auf Klick auf den Marker.
        event.stopPropagation(); // Verhindert, dass der Klick an die Tageszelle weitergereicht wird.
        openCalendarTaskModal(group.tasks); // Oeffnet den Dialog mit den passenden Aufgaben.
      };
      day.appendChild(marker); // Fuegt den Marker in den Kalendertag ein.
    });

    calendarGrid.appendChild(day); // Fuegt den Tag in den Kalender ein.
  }
}

function hasPriorityOnDate(isoDate, priority) { // Prueft, ob an einem Datum eine Aufgabe mit dieser Prioritaet liegt.
  return allTasks.some((task) => // Gibt true zurueck, sobald eine passende Aufgabe gefunden wird.
    String(task.priority || "1") === String(priority) && // Prioritaet muss passen.
    task.created && // Aufgabe braucht ein Startdatum.
    task.deadline && // Aufgabe braucht ein Ablaufdatum.
    isDateInTaskRange(isoDate, task) // Datum muss im Aufgabenzeitraum liegen.
  );
}

function getPriorityGroupsForDate(isoDate) { // Gruppiert Aufgaben eines Tages nach Prioritaet.
  const groups = {}; // Objekt fuer Gruppen, z. B. groups[5] = Aufgaben mit Prioritaet 5.

  allTasks.forEach((task) => { // Geht alle Aufgaben durch.
    if (!task.created || !task.deadline || !isDateInTaskRange(isoDate, task)) { // Ignoriert Aufgaben ohne passenden Zeitraum.
      return; // Springt zur naechsten Aufgabe.
    }

    const priority = task.priority || "1"; // Nutzt Prioritaet 1 als Standard.
    groups[priority] = groups[priority] || []; // Erstellt die Gruppe, falls sie noch nicht existiert.
    groups[priority].push(task); // Fuegt die Aufgabe zur passenden Prioritaetsgruppe hinzu.
  });

  return Object.keys(groups) // Holt alle vorhandenen Prioritaeten.
    .sort((a, b) => Number(b) - Number(a)) // Sortiert hohe Prioritaeten zuerst.
    .map((priority) => ({ // Wandelt jede Gruppe in ein einheitliches Objekt um.
      priority, // Prioritaetswert.
      tasks: groups[priority] // Aufgaben dieser Prioritaet.
    }));
}

function openCalendarTaskModal(tasks) { // Oeffnet einen Dialog mit Aufgaben aus dem Kalender.
  const title = document.getElementById("calendarTaskTitle"); // Ueberschrift des Dialogs.
  const details = document.getElementById("calendarTaskDetails"); // Container fuer die Aufgabenlinks.
  title.innerText = tasks.length > 1 ? "Tasks im Kalender" : "Task im Kalender"; // Passt Singular/Plural an.
  details.innerHTML = ""; // Entfernt alte Inhalte.

  tasks.forEach((task) => { // Erstellt fuer jede Aufgabe einen klickbaren Eintrag.
    const item = document.createElement("button"); // Button, damit der Eintrag anklickbar ist.
    item.type = "button"; // Verhindert Formularverhalten.
    item.className = "calendar-task-link"; // Setzt das Styling fuer Kalender-Aufgabenlinks.
    item.innerHTML = `
      <strong>#${task.ticketNumber} ${escapeHtml(task.title)}</strong>
      <span>
        ${escapeHtml(task.summary || "Keine Zusammenfassung")}<br>
        Prioritaet ${escapeHtml(task.priority || "Offen")} -
        ${escapeHtml(formatDisplayDate(task.created) || "Offen")} bis
        ${escapeHtml(formatDisplayDate(task.deadline) || "Offen")}
      </span>
    `; // Zeigt Titel, Beschreibung, Prioritaet und Zeitraum sicher escaped an.
    item.onclick = function() { // Reagiert auf Klick auf den Kalendereintrag.
      goToTask(task.id); // Springt zur passenden Aufgabenkarte.
    };
    details.appendChild(item); // Fuegt den Eintrag in den Dialog ein.
  });

  document.getElementById("calendarTaskModal").style.display = "flex"; // Zeigt den Kalenderdialog.
}

function closeCalendarTaskModal() { // Schliesst den Kalenderdialog.
  document.getElementById("calendarTaskModal").style.display = "none"; // Versteckt den Kalenderdialog.
}

function goToTask(taskId) { // Springt von einem Kalendereintrag zur Aufgabe in der Liste.
  const task = allTasks.find((item) => String(item.id) === String(taskId)); // Sucht die Aufgabe anhand der ID.
  const card = document.querySelector(`[data-task-id="${String(taskId)}"]`); // Sucht die passende Aufgabenkarte im HTML.

  if (!task || !card) { // Prueft, ob Aufgabe und Karte gefunden wurden.
    return; // Bricht ab, wenn etwas fehlt.
  }

  closeCalendarTaskModal(); // Schliesst den Kalenderdialog.
  closeDetailModal(); // Schliesst eine eventuell offene Detailansicht.
  card.scrollIntoView({ behavior: "smooth", block: "center" }); // Scrollt die Karte in die Bildschirmmitte.
  document.querySelectorAll(".task-card.focused").forEach((item) => item.classList.remove("focused")); // Entfernt alte Hervorhebungen.
  card.classList.add("focused"); // Hebt die gefundene Karte hervor.
  setTimeout(() => card.classList.remove("focused"), 2200); // Entfernt die Hervorhebung nach kurzer Zeit.
  openDetailModal(card, task); // Oeffnet direkt die Detailansicht.
}

function openNotifications() { // Oeffnet den Benachrichtigungsdialog.
  const list = document.getElementById("notificationList"); // Container fuer Benachrichtigungen.
  list.innerHTML = ""; // Entfernt alte Listeneintraege.

  if (notifications.length === 0) { // Prueft, ob Benachrichtigungen vorhanden sind.
    list.innerHTML = '<p class="task-summary">Keine Benachrichtigungen vorhanden.</p>'; // Zeigt Ersatztext.
  } else { // Es gibt Benachrichtigungen.
    notifications.forEach((notification) => { // Erstellt fuer jede Benachrichtigung ein Element.
      const item = document.createElement("div"); // Neues Benachrichtigungselement.
      item.className = "notification-item"; // Setzt das Styling.
      item.innerHTML = `
        <strong>${escapeHtml(notification.title)}</strong>
        <span>${escapeHtml(notification.time)}</span>
      `; // Zeigt Titel und Zeitpunkt sicher escaped an.
      list.appendChild(item); // Fuegt die Benachrichtigung ein.
    });
  }

  unreadNotificationCount = 0; // Beim Oeffnen gelten alle Benachrichtigungen als gelesen.
  updateNotificationBadge(); // Aktualisiert den roten Zaehler.
  document.getElementById("notificationModal").style.display = "flex"; // Zeigt den Dialog.
}

function closeNotifications() { // Schliesst den Benachrichtigungsdialog.
  document.getElementById("notificationModal").style.display = "none"; // Versteckt den Dialog.
}

function addNotification(action, task) { // Fuegt eine neue Benachrichtigung hinzu.
  notifications.unshift({ // Neue Meldungen stehen vorne in der Liste.
    title: `${action}: #${task.ticketNumber} ${task.title}`, // Titel mit Aktion und Ticketnummer.
    time: new Date().toLocaleString("de-DE") // Zeitpunkt der Meldung.
  });
  unreadNotificationCount += 1; // Erhoeht den Zaehler ungelesener Meldungen.
  updateNotificationBadge(); // Aktualisiert die Anzeige im Header.
}

function addTaskHistory(task, action) { // Fuegt einen Historieneintrag zu einer Aufgabe hinzu.
  task.history = task.history || []; // Stellt sicher, dass eine Historienliste existiert.
  task.history.unshift({ // Neuer Eintrag kommt nach oben.
    action, // Beschreibung der Aktion.
    time: new Date().toLocaleString("de-DE") // Zeitpunkt der Aktion.
  });
}

function addDueSoonNotifications() { // Erstellt Warnungen fuer bald faellige Aufgaben.
  allTasks.forEach((task) => { // Prueft jede Aufgabe.
    if (!task.deadline) { // Ohne Ablaufdatum kann keine Faelligkeit berechnet werden.
      return; // Springt zur naechsten Aufgabe.
    }

    const daysLeft = getDaysUntil(task.deadline); // Berechnet Tage bis zum Ablaufdatum.
    const alreadyExists = notifications.some((notification) => // Prueft, ob diese Warnung schon existiert.
      notification.title.includes(`#${task.ticketNumber}`) && // Gleiche Ticketnummer.
      notification.title.includes("Kurz vor Ablauf") // Gleicher Warnungstyp.
    );

    if (daysLeft >= 0 && daysLeft <= 2 && !alreadyExists) { // Warnt nur fuer heute, morgen oder uebermorgen.
      notifications.unshift({ // Fuegt die Warnung vorne ein.
        title: `Kurz vor Ablauf: #${task.ticketNumber} ${task.title}`, // Titel der Warnung.
        time: `Faellig in ${daysLeft} Tag(en)` // Zeigt die verbleibenden Tage.
      });
      unreadNotificationCount += 1; // Erhoeht den Zaehler ungelesener Meldungen.
    }
  });

  updateNotificationBadge(); // Aktualisiert den roten Zaehler.
}

function updateNotificationBadge() { // Aktualisiert den roten Benachrichtigungszaehler.
  const badge = document.getElementById("notificationBadge"); // Holt das Badge-Element.
  if (!badge) { // Falls das Badge im HTML fehlt.
    return; // Bricht ab.
  }

  badge.innerText = String(unreadNotificationCount); // Schreibt die aktuelle Anzahl ins Badge.
  badge.style.display = unreadNotificationCount > 0 ? "inline-flex" : "none"; // Zeigt das Badge nur bei ungelesenen Meldungen.
}

function isDateRangeValid(created, deadline) { // Prueft, ob das Ablaufdatum nicht vor dem Startdatum liegt.
  if (!created || !deadline) { // Wenn eines der Daten fehlt, kann kein Konflikt entstehen.
    return true; // Datumsspanne ist erlaubt.
  }

  return new Date(deadline) >= new Date(created); // Ablaufdatum muss gleich oder nach Erstelldatum sein.
}

function updateDeadlineMinimum() { // Setzt die Mindestgrenze fuer das Ablaufdatum.
  const createdInput = document.getElementById("taskCreated"); // Feld fuer das Erstelldatum.
  const deadlineInput = document.getElementById("taskDeadline"); // Feld fuer das Ablaufdatum.

  if (!createdInput || !deadlineInput) { // Prueft, ob beide Felder existieren.
    return; // Bricht ab, wenn ein Feld fehlt.
  }

  deadlineInput.min = createdInput.value || ""; // Ablaufdatum darf nicht vor dem Erstelldatum liegen.

  if (createdInput.value && deadlineInput.value && deadlineInput.value < createdInput.value) { // Prueft eine ungueltige Datumskombination.
    deadlineInput.setCustomValidity("Das Ablaufdatum darf nicht vor dem Erstelldatum liegen."); // Setzt Browser-Validierung.
  } else { // Datumskombination ist gueltig oder unvollstaendig.
    deadlineInput.setCustomValidity(""); // Entfernt die Fehlermeldung.
  }
}

function isDateInTaskRange(isoDate, task) { // Prueft, ob ein Datum im Zeitraum einer Aufgabe liegt.
  const date = new Date(isoDate); // Wandelt das Pruefdatum in ein Date-Objekt um.
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

function getNextTicketNumber() { // Bestimmt die naechste freie Ticketnummer.
  if (allTasks.length === 0) { // Keine Aufgaben vorhanden.
    return 1; // Erste Ticketnummer ist 1.
  }

  return Math.max(...allTasks.map((task) => Number(task.ticketNumber) || 0)) + 1; // Hoechste Nummer plus eins.
}

function createLocalId() { // Erstellt eine lokale eindeutige ID.
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`; // Kombiniert Zeitstempel und Zufallswert.
}

function normalizeDate(dateString) { // Vereinheitlicht Datumswerte fuer Formularfelder.
  if (!dateString || dateString === "Offen") { // Leere oder offene Daten werden leer gespeichert.
    return ""; // Leerer Wert fuer date-inputs.
  }

  if (dateString.includes(".")) { // Erkennt deutsche Datumswerte wie 01.02.2026.
    return toInputDate(dateString); // Wandelt deutsches Datum in yyyy-mm-dd um.
  }

  return dateString; // ISO-Datum kann direkt genutzt werden.
}

function toInputDate(dateString) { // Wandelt dd.mm.yyyy in yyyy-mm-dd um.
  if (!dateString || !dateString.includes(".")) { // Prueft, ob ein deutsches Datum vorliegt.
    return ""; // Kein verwertbares Datum.
  }

  const [day, month, year] = dateString.split("."); // Zerlegt Tag, Monat und Jahr.
  return `${year}-${month}-${day}`; // Baut das Format fuer input[type=date].
}

function fromInputDate(dateString) { // Wandelt yyyy-mm-dd in dd.mm.yyyy um.
  if (!dateString) { // Kein Datum vorhanden.
    return "Offen"; // Ersatztext fuer fehlende Daten.
  }

  const [year, month, day] = dateString.split("-"); // Zerlegt Jahr, Monat und Tag.
  return `${day}.${month}.${year}`; // Baut das deutsche Anzeigeformat.
}

function formatDisplayDate(dateString) { // Bereitet ein Datum fuer die Anzeige auf.
  if (!dateString) { // Kein Datum vorhanden.
    return ""; // Gibt leeren Text zurueck.
  }

  if (dateString.includes(".")) { // Datum ist bereits im deutschen Format.
    return dateString; // Gibt es unveraendert zurueck.
  }

  const [year, month, day] = dateString.split("-"); // Zerlegt ISO-Datum.

  if (!year || !month || !day) { // Prueft, ob das Datum unvollstaendig ist.
    return dateString; // Gibt unbekanntes Format unveraendert zurueck.
  }

  return `${day}.${month}.${year}`; // Gibt deutsches Anzeigeformat zurueck.
}

function toIsoDate(date) { // Wandelt ein Date-Objekt in yyyy-mm-dd um.
  const year = date.getFullYear(); // Jahr des Datums.
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Monat, zweistellig.
  const day = String(date.getDate()).padStart(2, "0"); // Tag, zweistellig.
  return `${year}-${month}-${day}`; // ISO-Format fuer Vergleiche und input-Felder.
}

function addDays(date, amount) { // Addiert Tage zu einem Datum.
  const copy = new Date(date); // Kopiert das Datum, damit das Original unveraendert bleibt.
  copy.setDate(copy.getDate() + amount); // Verschiebt die Kopie um die angegebene Tagesanzahl.
  return copy; // Gibt das neue Datum zurueck.
}

function escapeHtml(value) { // Macht Text sicher, bevor er in innerHTML eingesetzt wird.
  return String(value) // Wandelt den Wert zuerst in Text um.
    .replaceAll("&", "&amp;") // Escaped kaufmaennisches Und.
    .replaceAll("<", "&lt;") // Escaped oeffnende HTML-Klammer.
    .replaceAll(">", "&gt;") // Escaped schliessende HTML-Klammer.
    .replaceAll('"', "&quot;") // Escaped doppelte Anfuehrungszeichen.
    .replaceAll("'", "&#039;"); // Escaped einfache Anfuehrungszeichen.
}

window.onclick = function(event) { // Reagiert auf Klicks im Fenster.
  const detailModal = document.getElementById("detailModal"); // Detaildialog.
  const createModal = document.getElementById("createModal"); // Formulardialog.
  const calendarTaskModal = document.getElementById("calendarTaskModal"); // Kalenderdialog.
  const notificationModal = document.getElementById("notificationModal"); // Benachrichtigungsdialog.

  if (event.target === detailModal) { // Klick auf den dunklen Hintergrund des Detaildialogs.
    closeDetailModal(); // Schliesst den Detaildialog.
  }

  if (event.target === createModal) { // Klick auf den dunklen Hintergrund des Formulardialogs.
    closeCreateModal(); // Schliesst den Formulardialog.
  }

  if (event.target === calendarTaskModal) { // Klick auf den dunklen Hintergrund des Kalenderdialogs.
    closeCalendarTaskModal(); // Schliesst den Kalenderdialog.
  }

  if (event.target === notificationModal) { // Klick auf den dunklen Hintergrund des Benachrichtigungsdialogs.
    closeNotifications(); // Schliesst den Benachrichtigungsdialog.
  }
};

document.getElementById("taskCreated").addEventListener("change", updateDeadlineMinimum); // Aktualisiert Datumslimit, wenn das Erstelldatum geaendert wird.
document.getElementById("taskDeadline").addEventListener("change", updateDeadlineMinimum); // Aktualisiert Validierung, wenn das Ablaufdatum geaendert wird.
document.addEventListener("DOMContentLoaded", loadTasksFromBackend); // Laedt Aufgaben, sobald das HTML vollstaendig geladen ist.
