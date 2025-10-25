from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from typing import Dict, List

app = FastAPI()

# --- CORREÇÃO AQUI ---
app.mount("/images", StaticFiles(directory="app/static/images"), name="images")
app.mount("/src", StaticFiles(directory="app/static/src"), name="src")
# --------------------

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}
        self.nicknames: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, room_name: str, nickname: str):
        await websocket.accept()
        if room_name not in self.rooms:
            self.rooms[room_name] = []
        self.rooms[room_name].append(websocket)
        self.nicknames[websocket] = nickname
        await self.broadcast_user_list(room_name)
        await self.broadcast_notification(room_name, f"{nickname} entrou na sala.")

    async def disconnect(self, websocket: WebSocket, room_name: str):
        nickname = self.nicknames.get(websocket, "Alguém")
        if room_name in self.rooms:
            self.rooms[room_name].remove(websocket)
            if not self.rooms[room_name]:
                del self.rooms[room_name]
        
        if websocket in self.nicknames:
            del self.nicknames[websocket]

        if room_name in self.rooms:
            await self.broadcast_user_list(room_name)
            await self.broadcast_notification(room_name, f"{nickname} saiu da sala.")

    def get_users_in_room(self, room_name: str) -> List[str]:
        return [self.nicknames[ws] for ws in self.rooms.get(room_name, []) if ws in self.nicknames]

    async def broadcast_user_list(self, room_name: str):
        users = self.get_users_in_room(room_name)
        message = {"type": "user_list", "users": users}
        await self.broadcast_json(room_name, message)

    async def broadcast_chat_message(self, room_name: str, sender: str, content: str):
        message = {"type": "chat", "sender": sender, "content": content}
        await self.broadcast_json(room_name, message)

    async def broadcast_notification(self, room_name: str, content: str):
        message = {"type": "notification", "content": content}
        await self.broadcast_json(room_name, message)

    async def broadcast_json(self, room_name: str, message: dict):
        if room_name in self.rooms:
            for connection in self.rooms[room_name]:
                await connection.send_json(message)

manager = ConnectionManager()

@app.get("/")
async def get():
    # --- CORREÇÃO AQUI ---
    with open("app/static/index.html", "r") as f:
        return HTMLResponse(f.read())
# --------------------

@app.get("/api/rooms")
async def get_rooms():
    return list(manager.rooms.keys())

@app.websocket("/ws/{room_name}/{nickname}")
async def websocket_endpoint(websocket: WebSocket, room_name: str, nickname: str):
    await manager.connect(websocket, room_name, nickname)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast_chat_message(room_name, nickname, data)
    except WebSocketDisconnect:
        await manager.disconnect(websocket, room_name)