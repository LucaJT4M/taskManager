from fastapi import FastAPI
from db_manager import *

# Beispielnutzung der Funktionen

# Task1 = Task(0, "Task1", "Task1 abschließen", 1, "2007-12-13", "User1", "2024-06-30") #beispiel Task, um zu testen ob die Funktionen funktionieren
# ensure_table_exists() #checkt ob Tabelle existiert

# create_Task(Task1) #erstellt die definierte Task1 in der Datenbank
# GIG = read_Tasks() # GIG ist eine Liste von Tasks, die aus der Datenbank gelesen wurden
# for task in GIG: #durchforstet alle Tasks in GIG und gibt sie aus 
#     print(f"ID: {task.id}, Title: {task.title}, Conclusion: {task.conclusion}, Priority: {task.Priority}, Date: {task.Date}, User_Name: {task.User_Name}, Expire_Date: {task.Expire_Date}") #geht eine task nach der anderen in GIG durch und gibt sie aus

# delete_Task(1) #löscht die beispile ID1 
 
app = FastAPI() # erstellt die FastAPI APP 

@app.get("/get_tasks") # definiert den Endpunkt /get_tasks, den der Kenny im Frontend benutzt um die Tasks aus der Datenbank zu holen
async def get_tasks():  # definiert die Funktion get_Tasks
    return read_Tasks() #benutzt die sovor im db_manager definierte Funktion read_Tasks, um die Tasks aus der Datenbank zu holen und auszugeben

@app.get("/get_task/{id}") # definiert den Endpunkt um genau EINE Task zu holen
async def get_task(id: int): # Funktion um genau ein Task zu holen bei der die ID eine Zahl sein muss
    tasks = read_Tasks() # holt erstmal alle Tasks aus der Datenabnk weil akutell keine Funktion existiert die nur genau eine Task holen kann 
    for task in tasks: # for Schleife um alle Tasks durchzugehen und zu checken ob deren ID mit der gesuchten ID übereinstimmt
        if task.id == id: # wenn die ID übereinstimmt, ird die Task ausgegeben
            return task  
    return {"error": "Task not found"} # wenn keine Taks mit der ID gefunden wird, gibt es eine Fehlermeldung

@app.post("/post_tasks/") # definiert den Endpunkt um Tasks zu erstellen
async def post_tasks(task: Task): # erstellung der Funktion um Tasks zu erstellen
    created_task = create_Task(task)

    if created_task: # checkt die create_Task funktion im db_manager ob eine Task erstellt wurde, wenn ja gibt er eine Erfolgsmeldung zurück
        return {"message": "Task created successfully", "new_task": created_task}
    else: 
        return {"error": "Failed to create task"} # wenn Task nicht erstellt werden konnte geht er die If schleife durch und gibt eine Fehlermeldung zurück

@app.get("/get_tasks_for_esp") # definiert den Endpunkt um die Tasks für das ESP zu holen.
async def get_tasks_for_esp(): 
    tasks = read_Tasks() # holt alle Tasks aus der Datenbank
    # 2. Augewählte Daten in ein json umwandeln
    taks_for_esp = []
    for task in tasks: # geht alle Tasks durch und wählt nur die Daten aus die das ESP braucht.
        task_data = {   # definiert die Daten die das ESP braucht, ID, Title und checked.
            "id": task.id,
            "title": task.title,
            "checked": task.checked,
        }
        taks_for_esp.append(task_data) # fügt die ausgewählten Daten in die Liste taks_for_esp ein
        return taks_for_esp # gibt die Liste mit den Daten für das ESP aus

# UPDATE LUCA: Hier gabs nen fehler beim Post, da es besser ist einen body hinzuzufügen (mit async def post_tasks(task: Task) und das entfernen von @app.post("/post_tasks/{task}"))

@app.put("/update_task/{id}") # definiert den Endpunkt um Tasks zu updaten
async def put_Task(id: int, updated_task: Task): #definierung der Funktion um Tasks zu updaten, ID muss eine Zahl sein
    existing_task = await get_task(id) # holt die bereits bestehende Task mit der angegebenen ID aus der Datenbank
    if isinstance(existing_task, dict) and existing_task.get("error") == "Task not found": # prüft ob die Task mit der ID überhaupt existiert
        return {"error": "Task not found"} # wenn keine Task gefunden wurde, wird eine Fehlermeldung zurückgegeben

    if existing_task == updated_task: # vergleicht die bestehende Task mit der neuen updated_task ob sich etwas geändert hat
        return {"message": "Task is already up to date"}  # sucht sich in der Datenbank die Task mit der ID und vergleicht ob sich diese verändert hat, wenn nicht dann gibt er eine mMeldung das die Task already up to date ist
    update_Task(id, updated_task) # wenn die Task in der Datenbank already up to date ist, wird die Funktion hier ignoriert 
    return {"message": "Task updated successfully"} #wenn die Task in der Datenbank nicht already up to date ist, wird die Funktion hier ausgeführt und die Task wird geupdatet, danach gibt es eine Erfolgsmeldung zurück

@app.delete("/delete_task/{id}") # definiert den Endpunkt um Tasks zu löschen
async def delete_task(id: int): # Funktion um Tasks zu löschen, id muss eine Zahl sein
    existing_task = await get_task(id)
    if not (isinstance(existing_task, dict) and existing_task.get("error") == "Task not found"): # checkt ob die Task mit der ID existiert, wenn ja wird sie gelöscht
        delete_Task(id)
        return {"message": "Task deleted successfully"} # wenn die Task gelöscht wurde, gibt es eine Erfolgsmeldung zurück
    else: 
        return {"error": "Task not found"} # wenn die Task mit der ID nicht gefunden wird, gibt es eine Fehlermeldung zurück
    
# Run the FastAPI development server
if __name__ == "__main__":
    import uvicorn

    # Start the server on 127.0.0.1:8000
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)