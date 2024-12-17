import json
import ollama

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # FIXME: replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="src/static"), name="static")
app.mount("/static/images", StaticFiles(directory="src/static/images"), name="images")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    philosopher: str = "marcus_aurelius"

class ChatResponse(BaseModel):
    response: str
    
@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        async def generate():
            stream = ollama.chat(
                model='marcus-llama3.2',
                messages=formatted_messages,
                stream=True
            )
            
            for chunk in stream:
                if 'message' in chunk and 'content' in chunk['message']:
                    yield f"data: {json.dumps({'content': chunk['message']['content']})}\n\n"
            
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/philosophers")
async def get_philosophers():
    # TODO: expand list ofphilosophers
    return {
        "philosophers": [
            {
                "id": "marcus_aurelius",
                "name": "Marcus Aurelius",
                "description": "Roman Emperor and Stoic philosopher"
            }
        ]
    }

@app.get("/")
async def read_root():
    return FileResponse("src/static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
