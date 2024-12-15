from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import ollama
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="src/static"), name="static")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    philosopher: str = "marcus_aurelius"  # Default to Marcus Aurelius

class ChatResponse(BaseModel):
    response: str
    
@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Format messages for ollama
        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Call ollama using the llama3.2 model
        response = ollama.chat(
            model='marcus-llama3.2', # custom chat model
            messages=formatted_messages
        )
        
        return ChatResponse(response=response['message']['content'])
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/philosophers")
async def get_philosophers():
    # For future expansion, return list of available philosophers
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
