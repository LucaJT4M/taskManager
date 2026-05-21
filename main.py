import sqlite3
from fastapi import FastAPI

class Task: 
    def __init__(self, id: int, title: str, conclusion: str, Priority: int, Date: sqlite3.Date,User_Name: str, Expire_Date: sqlite3.Date):
        self.id = id
        self.title = title
        self.conclusion = conclusion
        self.Priority = Priority
        self.Date = Date
        self.User_Name = User_Name
        self.Expire_Date = Expire_Date

def ensure_table_exists():
    conn = sqlite3.connect('tasks.db') #baut verbindung zur datenbank auf
    kirkler = conn.cursor() #kirkler ist da um die Datenbank zu editieren
    kirkler.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            conclusion TEXT,
            Priority INTEGER,
            Date DATE,
            User_Name TEXT,
            Expire_Date DATE
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
        Task1 = Task(Aufg[0], Aufg[1], Aufg[2], Aufg[3], Aufg[4], Aufg[5], Aufg[6]) #wandelt die Einträge aus der Datenbank in Einträge fürs Programm um
        redo.append(Task1) #fügt die einträge an die richtige Stelle in der Liste ein, bsp. Eintrag 5 wird hinzugefügt und "append" fügt den Eintrag an die 5. Stelle der Liste hinzu
    return redo # gibt die Variable redo zurück, damit andere Funktionen sie auch benutzen können

def create_Task(to_add_Task: Task):#erstellt Tasks in der Datenbank
    conn = sqlite3.connect("tasks.db")
    kirkler = conn.cursor()
    kirkler.execute("INSERT INTO tasks (title,conclusion,Priority,Date,User_Name,Expire_Date) VALUES (?,?,?,?,?,?)", (to_add_Task.title, to_add_Task.conclusion, to_add_Task.Priority, to_add_Task.Date, to_add_Task.User_Name, to_add_Task.Expire_Date)) #added die Werte aus to_add_Task in die Datenbank ein
    conn.commit()
    conn.close()

def delete_Task(id: int): #löscht Tasks aus der Datenbank
    conn = sqlite3.connect("tasks.db")
    kirkler = conn.cursor()
    kirkler.execute("DELETE FROM tasks WHERE id=?", (id,)) #löscht den Eintrag mit der angegebenen ID aus der Datenbank
    conn.commit()
    conn.close()

Task1 = Task(0, "Task1", "Task1 abschließen", 1, "2007-12-13", "User1", "2024-06-30") #beispiel Task, um zu testen ob die Funktionen funktionieren
ensure_table_exists() #checkt ob Tabelle existiert

create_Task(Task1) #erstellt die definierte Task1 in der Datenbank
GIG = read_Tasks() # GIG ist eine Liste von Tasks, die aus der Datenbank gelesen wurden
for Task in GIG: #durchforstet alle Tasks in GIG und gibt sie aus 
    print(f"ID: {Task.id}, Title: {Task.title}, Conclusion: {Task.conclusion}, Priority: {Task.Priority}, Date: {Task.Date}, User_Name: {Task.User_Name}, Expire_Date: {Task.Expire_Date}") #geht eine task nach der anderen in GIG durch und gibt sie aus

delete_Task(1) #löscht die beispile ID1 
