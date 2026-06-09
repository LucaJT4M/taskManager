# Task Manager

Ein einfacher Task Manager mit FastAPI-Backend, SQLite-Datenbank und einem HTML/CSS/JavaScript-Frontend. Aufgaben koennen erstellt, angezeigt, bearbeitet und geloescht werden. Das Frontend zeigt die Aufgabenliste, Detailansichten, Benachrichtigungen und einen Kalender fuer Aufgabenzeitraeume.

## Projektstruktur

```text
taskManager/
├── main.py           # FastAPI-App mit API-Endpunkten
├── db_manager.py     # SQLite-Zugriff und Task-Modell
├── tasks.db          # SQLite-Datenbank
├── requirements.txt  # Python-Abhaengigkeiten
├── README.md
└── FE/
    ├── UI.html       # Frontend-Oberflaeche
    └── scripts.js    # Frontend-Logik und API-Aufrufe
```

## Voraussetzungen

- Python 3.10 oder neuer
- pip

## Installation

Abhaengigkeiten installieren:

```bash
pip install -r requirements.txt
```

## Backend starten

Im Ordner `taskManager` ausfuehren:

```bash
uvicorn main:app --reload
```

Das Backend laeuft danach standardmaessig unter:

```text
http://127.0.0.1:8000
```

Die automatische FastAPI-Dokumentation ist erreichbar unter:

```text
http://127.0.0.1:8000/docs
```

## Frontend starten

Die Datei `FE/UI.html` im Browser oeffnen. Das Frontend erwartet das Backend unter:

```text
http://127.0.0.1:8000
```

## Datenmodell: Task

Eine Aufgabe hat folgende Felder:

| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `id` | integer oder null | Eindeutige ID der Aufgabe. Wird beim Erstellen automatisch vergeben. |
| `title` | string | Titel der Aufgabe. |
| `conclusion` | string | Beschreibung oder Zusammenfassung der Aufgabe. |
| `priority` | integer | Prioritaet der Aufgabe, z. B. 1 bis 5. |
| `date` | string | Erstelldatum im Format `YYYY-MM-DD`. |
| `user_name` | string | Name der Person, die die Aufgabe erstellt hat. |
| `expire_date` | string | Ablaufdatum im Format `YYYY-MM-DD`. |

Beispiel fuer einen Task:

```json
{
  "id": 1,
  "title": "Sensor pruefen",
  "conclusion": "Temperatursensor im IoT-Aufbau testen",
  "priority": 3,
  "date": "2026-06-09",
  "user_name": "Max",
  "expire_date": "2026-06-12"
}
```

## API-Endpunkte

Basis-URL:

```text
http://127.0.0.1:8000
```

### GET `/get_tasks`

Gibt alle gespeicherten Aufgaben zurueck.

**Request-Body:** keiner

**Beispiel-Response:**

```json
[
  {
    "id": 1,
    "title": "Sensor pruefen",
    "conclusion": "Temperatursensor im IoT-Aufbau testen",
    "priority": 3,
    "date": "2026-06-09",
    "user_name": "Max",
    "expire_date": "2026-06-12"
  }
]
```

### GET `/get_task/{id}`

Gibt eine einzelne Aufgabe anhand ihrer ID zurueck.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
| --- | --- | --- |
| `id` | integer | ID der gesuchten Aufgabe. |

**Beispiel:**

```text
GET /get_task/1
```

**Erfolgreiche Response:**

```json
{
  "id": 1,
  "title": "Sensor pruefen",
  "conclusion": "Temperatursensor im IoT-Aufbau testen",
  "priority": 3,
  "date": "2026-06-09",
  "user_name": "Max",
  "expire_date": "2026-06-12"
}
```

**Fehler-Response:**

```json
{
  "error": "Task not found"
}
```

### POST `/post_tasks/`

Erstellt eine neue Aufgabe. Die ID kann im Request `null` sein, da sie von der Datenbank automatisch vergeben wird.

**Request-Body:**

```json
{
  "id": null,
  "title": "Sensor pruefen",
  "conclusion": "Temperatursensor im IoT-Aufbau testen",
  "priority": 3,
  "date": "2026-06-09",
  "user_name": "Max",
  "expire_date": "2026-06-12"
}
```

**Erfolgreiche Response:**

```json
{
  "message": "Task created successfully",
  "new_task": {
    "id": 1,
    "title": "Sensor pruefen",
    "conclusion": "Temperatursensor im IoT-Aufbau testen",
    "priority": 3,
    "date": "2026-06-09",
    "user_name": "Max",
    "expire_date": "2026-06-12"
  }
}
```

**Fehler-Response:**

```json
{
  "error": "Failed to create task"
}
```

### PUT `/update_task/{id}`

Aktualisiert eine vorhandene Aufgabe anhand ihrer ID.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
| --- | --- | --- |
| `id` | integer | ID der Aufgabe, die aktualisiert werden soll. |

**Request-Body:**

```json
{
  "id": 1,
  "title": "Sensor erneut pruefen",
  "conclusion": "Temperatursensor kalibrieren und Messwerte vergleichen",
  "priority": 4,
  "date": "2026-06-09",
  "user_name": "Max",
  "expire_date": "2026-06-13"
}
```

**Erfolgreiche Response:**

```json
{
  "message": "Task updated successfully"
}
```

**Weitere moegliche Response:**

```json
{
  "message": "Task is already up to date"
}
```

**Fehler-Response:**

```json
{
  "error": "Task not found"
}
```

### DELETE `/delete_task/{id}`

Loescht eine Aufgabe anhand ihrer ID.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
| --- | --- | --- |
| `id` | integer | ID der Aufgabe, die geloescht werden soll. |

**Beispiel:**

```text
DELETE /delete_task/1
```

**Erfolgreiche Response:**

```json
{
  "message": "Task deleted successfully"
}
```

**Fehler-Response:**

```json
{
  "error": "Task not found"
}
```

## Beispiel mit curl

Neue Aufgabe erstellen:

```bash
curl -X POST "http://127.0.0.1:8000/post_tasks/" \
  -H "Content-Type: application/json" \
  -d '{
    "id": null,
    "title": "Sensor pruefen",
    "conclusion": "Temperatursensor im IoT-Aufbau testen",
    "priority": 3,
    "date": "2026-06-09",
    "user_name": "Max",
    "expire_date": "2026-06-12"
  }'
```

Alle Aufgaben abrufen:

```bash
curl "http://127.0.0.1:8000/get_tasks"
```

## Hinweise

- Die Daten werden in der SQLite-Datei `tasks.db` gespeichert.
- Die Tabelle `tasks` wird in `db_manager.py` ueber `ensure_table_exists()` definiert.
- Falls das Frontend keine Aufgaben laden kann, muss zuerst das Backend mit `uvicorn main:app --reload` gestartet werden.
