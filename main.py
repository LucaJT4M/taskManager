from fastapi import FastAPI
from db_manager import *

# Beispielnutzung der Funktionen

Task1 = Task(0, "Task1", "Task1 abschließen", 1, "2007-12-13", "User1", "2024-06-30") #beispiel Task, um zu testen ob die Funktionen funktionieren
ensure_table_exists() #checkt ob Tabelle existiert

create_Task(Task1) #erstellt die definierte Task1 in der Datenbank
GIG = read_Tasks() # GIG ist eine Liste von Tasks, die aus der Datenbank gelesen wurden
for Task in GIG: #durchforstet alle Tasks in GIG und gibt sie aus 
    print(f"ID: {Task.id}, Title: {Task.title}, Conclusion: {Task.conclusion}, Priority: {Task.Priority}, Date: {Task.Date}, User_Name: {Task.User_Name}, Expire_Date: {Task.Expire_Date}") #geht eine task nach der anderen in GIG durch und gibt sie aus

delete_Task(1) #löscht die beispile ID1 
 
app = FastAPI() # erstellt die FastAPI APP 

@app.get("/get_tasks") # definiert den Endpunkt /get_tasks, den der Kenny im Frontend benutzt um die Tasks aus der Datenbank zu holen
def get_tasks():  # definiert die Funktion get_Tasks
    return read_Tasks() #benutzt die sovor im db_manager definierte Funktion read_Tasks, um die Tasks aus der Datenbank zu holen und auszugeben
