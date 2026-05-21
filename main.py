import sqlite3
from fastapi import FastAPI

class Task: 
    def __init__(self, id: int, title: str, description: str, conclusion: str, Priority: int, Date: sqlite3.Date,User_Name: str, Expire_Date: sqlite3.Date):
        self.id = id
        self.title = title
        self.conclusion = conclusion
        self.Priority = Priority
        self.Date = Date
        self.User_Name = User_Name
        Expire_Date = Expire_Date



