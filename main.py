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
        Expire_Date = Expire_Date

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

