# Stoic Mentor

## Overview
A local chatbot that takes on the persona of a stoic mentor.

## Stack
- Python (3.12.2)
- [Ollama](https://github.com/ollama/ollama)
- [Llama3.2](https://ollama.com/library/llama3.2)

## Getting started (WIP)

Create a custom model (default is `marcus-llama3.2` which creates a model with the persona of Marcus Aurelius)
```bash
ollama create marcus-llama3.2 -f llama3.2.modelfile
```

Run the model to chat via the terminal. This is useful for testing the model.
```bash
ollama run marcus-llama3.2
```

Install dependencies
```bash
pip install -r requirements.txt
```

Run the backend
```bash
uvicorn src.main:app --reload
```

Navigate to `http://localhost:8000/` in your browser to use the chatbot.

## TODO
- [ ] Use a better speech synthesis engine to make the voice more natural
- [x] Add support for user voice input (currently only the assistant can speak).