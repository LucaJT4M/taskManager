import sqlite3
from pydantic import BaseModel

# Klasse Definierung für Task
class Task(BaseModel): 
    id: int | None = None
    title: str
    conclusion: str
    priority: int
    date: str
    user_name: str
    expire_date: str
    checked: bool | None = None #checked ist eine Variable die angibt ob die Task erledigt ist oder nicht, sie ist optional und wird nicht in der Datenbank gespeichert, sondern nur im Programm benutzt

def ensure_table_exists():
    conn = sqlite3.connect('tasks.db') #baut verbindung zur datenbank auf
    kirkler = conn.cursor() #kirkler ist da um die Datenbank zu editieren
    kirkler.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            conclusion TEXT,
            priority INTEGER,
            date DATE,
            user_name TEXT,
            expire_date DATE,
            checked BOOLEAN,
        )
    ''')    # Tabelle wird erstellt, wenn es sie noch nicht gibt, mit den hier definierten Spalten
    conn.commit()
    conn.close() #bricht die Verbindung zur Datenbank ab

def read_Tasks() -> list[Task]: #gibt eine Liste von Tasks zurpück
    conn = sqlite3.connect('tasks.db')
    kirkler = conn.cursor()
    kirkler.execute("SELECT * FROM tasks") #wählt alle Einträge aus der Tabelle aus 
    tasks = kirkler.fetchall() #speichert die enträge aus der Tabelle in Tasks 
    conn.close()
    redo = []
    for Aufg in tasks:
        Task1 = Task(id=Aufg[0], title=Aufg[1], conclusion=Aufg[2], priority=Aufg[3], date=Aufg[4], user_name=Aufg[5], expire_date=Aufg[6], checked=Aufg[7]) #wandelt die Einträge aus der Datenbank in Einträge fürs Programm um
        redo.append(Task1) #fügt die einträge an die richtige Stelle in der Liste ein, bsp. Eintrag 5 wird hinzugefügt und "append" fügt den Eintrag an die 5. Stelle der Liste hinzu
    return redo # gibt die Variable redo zurück, damit andere Funktionen sie auch benutzen können


# crud Tasks

def create_Task(to_add_Task: Task):#erstellt Tasks in der Datenbank
    conn = sqlite3.connect("tasks.db")
    kirkler = conn.cursor()
    kirkler.execute("INSERT INTO tasks (title,conclusion,priority,date,user_name,expire_date,checked) VALUES (?,?,?,?,?,?)", (to_add_Task.title, to_add_Task.conclusion, to_add_Task.priority, to_add_Task.date, to_add_Task.user_name, to_add_Task.expire_date, to_add_Task.checked)) #added die Werte aus to_add_Task in die Datenbank ein
    Task_ID = kirkler.lastrowid #holt die ID der soeben erstellten Task
    conn.commit()
    conn.close()
    return Task(id=Task_ID, title=to_add_Task.title, conclusion=to_add_Task.conclusion, priority=to_add_Task.priority, date=to_add_Task.date, user_name=to_add_Task.user_name, expire_date=to_add_Task.expire_date, checked=to_add_Task.checked) #gibt die soeben erstellte Task zurück mit der ID die sie in der Datenbank bekommen hat

def delete_Task(id: int): #löscht Tasks aus der Datenbank
    conn = sqlite3.connect("tasks.db")
    kirkler = conn.cursor()
    kirkler.execute("DELETE FROM tasks WHERE id=?", (id,)) #löscht den Eintrag mit der angegebenen ID aus der Datenbank
    conn.commit()
    conn.close()

def update_Task(id: int, updated_Task: Task): #aktualisiert Tasks in der Datenbank
    conn = sqlite3.connect("tasks.db")
    kirkler = conn.cursor()
    kirkler.execute("UPDATE tasks SET title=?, conclusion=?, priority=?, date=?, user_name=?, expire_date=?, checked=? WHERE id=?", (updated_Task.title, updated_Task.conclusion, updated_Task.priority, updated_Task.date, updated_Task.user_name, updated_Task.expire_date, updated_Task.checked, id)) #aktualisiert die Einträge mit jeweiligen ID in der Datenbank mit Wertern updated_Task
    conn.commit()
    conn.close()