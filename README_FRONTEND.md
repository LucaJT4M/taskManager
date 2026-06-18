# Frontend-Dokumentation

Dieses Dokument beschreibt das Frontend der Aufgabenverwaltung bestehend aus `index.html` und `scripts.js`.
Das Frontend wurde von Kenny entwickelt und bietet eine browserbasierte Oberfläche zur Anzeige, Erstellung, Bearbeitung und Löschung von Aufgaben.

## Übersicht

- `index.html` enthält die Benutzeroberfläche, das Layout, die Modale und die Styles für die App.
- `scripts.js` enthält die JavaScript-Logik für das Laden von Aufgaben, die Kommunikation mit dem Backend, die Anzeige des Kalenders, Benachrichtigungen und Interaktionen.

## Nutzung

1. Stelle sicher, dass das Backend läuft und erreichbar ist.
2. Öffne `index.html` im Browser.
3. Das Frontend lädt automatisch die Aufgaben vom Backend.
4. Erstelle neue Aufgaben, bearbeite bestehende oder lösche Aufgaben direkt über die Oberfläche.

## API-Verbindung

Das Frontend verwendet die Konstante `API_URL` in `scripts.js`:

```js
const API_URL = "http://192.168.88.69:8000";
```

Diese URL muss auf das laufende Backend zeigen. Standardmäßig erwartet das Frontend folgende Endpunkte:

- `GET ${API_URL}/get_tasks` – lädt alle Aufgaben
- `POST ${API_URL}/post_tasks/` – erstellt eine neue Aufgabe
- `PUT ${API_URL}/update_task/{id}` – aktualisiert eine Aufgabe
- `DELETE ${API_URL}/delete_task/{id}` – löscht eine Aufgabe

## `index.html`

### Hauptbereiche

- Kopfbereich
  - App-Bezeichnung, Titel und Beschreibungen.
  - Buttons für Kalender, Benachrichtigungen und neue Aufgabe.
- Aufgabenliste
  - Container mit der ID `taskList`, in den die Aufgabenkarten eingefügt werden.
- Kalenderbereich
  - Umschaltbarer Kalender (`calendarPanel`) mit Monatsübersicht und `calendarGrid`.
- Modale
  - `detailModal` für Aufgaben-Details
  - `createModal` für das Erstellen/Bearbeiten von Aufgaben
  - `calendarTaskModal` für Aufgaben, die im Kalender markiert sind
  - `notificationModal` für Benachrichtigungen

### Formularelemente

Das Erstell-/Bearbeitungsformular enthält folgende Eingabefelder:

- `taskTitle` – Titel der Aufgabe
- `taskSummary` – Zusammenfassung/Beschreibung
- `taskPriority` – Priorität 1–5
- `taskCreated` – Erstelldatum
- `taskCreator` – Name des Erstellers
- `taskDeadline` – Ablaufdatum
- `taskEditedYes` / `taskEditedNo` – Statusfeld für bearbeitet/nicht bearbeitet

### Anzeige und Interaktion

- Detailansicht zeigt alle Aufgabeninformationen inklusive Historie und „Bearbeitet“-Status.
- Buttons zum Bearbeiten und Löschen einer Aufgabe sind in der Detailansicht verfügbar.
- Der Kalender zeigt Aufgaben über Zeiträume an und ermöglicht ein Springen zur jeweiligen Aufgabe.
- Benachrichtigungen warnen bei bald fälligen Aufgaben und bei Aktionen wie Löschen.

## `scripts.js`

### Daten und Zustand

Wichtige State-Variablen:

- `selectedTaskCard` – aktuell ausgewählte Karten-DOM-Referenz
- `currentTask` – aktuell ausgewähltes Task-Objekt
- `editingTaskCard` – Karte, die gerade bearbeitet wird
- `allTasks` – Liste aller geladenen Aufgaben
- `notifications` – Liste aller Benachrichtigungen
- `unreadNotificationCount` – Anzahl ungelesener Benachrichtigungen
- `currentCalendarDate` – aktuell im Kalender gezeigtes Datum

### Wichtige Funktionen

#### Laden und Speichern

- `loadTasksFromBackend()`
  - Holt Aufgaben vom Backend und legt sie in `allTasks` ab.
  - Rendert Aufgabenliste, Kalender und Benachrichtigungen.
- `sendTaskToBackend(task, method)`
  - Sendet `POST` oder `PUT` zum Backend.
- `deleteTaskInBackend(taskId)`
  - Sendet `DELETE` zum Backend.

#### Mapping zwischen Backend und UI

- `mapApiTask(apiTask, ticketNumber)`
  - Formatiert Backend-Daten für die Anzeige im Frontend.
- `mapUiTaskToApiTask(task)`
  - Wandelt UI-Daten in das API-Format um.

#### Aufgabendarstellung

- `renderTasks()`
  - Erzeugt Task-Karten aus `allTasks`.
- `createTaskCard(task)` / `updateTaskCard(card, task)`
  - Baut einzelne Karten und setzt Inhalte wie Titel, Priorität, Ersteller, Deadline und Status.
- `openDetailModal(card, task)`
  - Öffnet die Detailansicht einer Aufgabe.
- `renderTaskHistory(task)`
  - Zeigt die Änderungshistorie einer Aufgabe an.

#### Formularverwaltung

- `openCreateModal()` / `closeCreateModal()`
  - Öffnet bzw. schließt das Erstellformular.
- `openEditModal()` / `closeEditModal()`
  - Öffnet das Bearbeitungsformular und füllt Felder mit Task-Daten.
- `getFormCheckedValue()` / `setFormCheckedRadios(value)`
  - Liest und setzt den „Bearbeitet“-Status aus den Radio-Buttons.
- `updateDeadlineMinimum()`
  - Sorgt dafür, dass das Ablaufdatum nicht vor dem Erstelldatum liegt.

#### Kalender

- `renderCalendar()`
  - Zeichnet die Monatsansicht und zeigt Aufgaben als farbige Marker an.
- `changeCalendarMonth(direction)`
  - Wechselt zwischen den Monaten.
- `openCalendarTaskModal(tasks)`
  - Zeigt Aufgaben an, die an einem Kalenderdatum liegen.
- `goToTask(taskId)`
  - Springt von einem Kalendereintrag zur jeweiligen Aufgabe.

#### Benachrichtigungen

- `openNotifications()` / `closeNotifications()`
  - Öffnet bzw. schließt das Benachrichtigungsfenster.
- `addNotification(action, task)`
  - Fügt eine neue Benachrichtigung hinzu.
- `addDueSoonNotifications()`
  - Prüft Aufgaben auf baldige Fälligkeit und erstellt Hinweise.
- `updateNotificationBadge()`
  - Aktualisiert die Anzeige ungelesener Nachrichten.

### Datums- und Hilfsfunktionen

- `normalizeDate(dateString)`
  - Formatiert Datumswerte für das Eingabefeld `type=date`.
- `formatDisplayDate(dateString)`
  - Zeigt Datumswerte im deutschen Format `dd.mm.yyyy` an.
- `isDateRangeValid(created, deadline)`
  - Validiert, dass das Ablaufdatum nicht vor dem Erstelldatum liegt.
- `isDateInTaskRange(isoDate, task)`
  - Prüft, ob ein Datum im Aufgabenzeitraum liegt.
- `getDaysUntil(isoDate)`
  - Berechnet die verbleibenden Tage bis zum Datum.
- `createLocalId()`
  - Erzeugt lokale IDs für Aufgaben, falls keine Backend-ID vorhanden ist.
- `escapeHtml(value)`
  - Schützt vor unsicherem HTML-Output.

## Hinweise für Entwickler

- Die App erwartet ein JSON-API-Backend mit den Endpunkten `get_tasks`, `post_tasks`, `update_task` und `delete_task`.
- Das Feld `checked` wird im Frontend als `Bearbeitet`-Status dargestellt.
- Die CSS-Klassen `priority-color-1` bis `priority-color-5` steuern die Kalenderfarben.
- Wenn das Backend unter einer anderen Adresse läuft, muss `API_URL` in `scripts.js` angepasst werden.

## Anpassungen

- `index.html` kann erweitert werden, um weitere Filter oder Sortierfunktionen hinzuzufügen.
- `scripts.js` kann modularisiert werden, wenn weitere Features wie Nutzeranmeldung oder erweiterte Filter benötigt werden.

---

### Autor
Frontend-Komponenten erstellt von Kenny.
