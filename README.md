# 🎙️ HARRY — Voice-First Web Personal Assistant

HARRY is a voice-first AI web assistant powered by **MiMo-V2.5** via [OpenCode Zen API](https://opencode.ai). It features voice interaction, persistent memory, notes, tasks, and a stunning dark glassmorphism UI.

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)

## ✨ Features

- 🎤 **Voice-First** — Push-to-talk with Web Speech API (STT + TTS)
- 💬 **Chat Fallback** — Full text chat interface
- 🧠 **Memory System** — Persistent user memory across sessions
- 📝 **Notes** — Create, search, and manage notes
- ✅ **Tasks** — Task management with completion tracking
- 📁 **File Upload** — Process TXT, PDF, DOCX, JSON, CSV files
- 🌐 **Multi-language** — English, Urdu, Roman Urdu, mixed
- 🎨 **Premium UI** — Dark glassmorphism with neon accents

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/harry.git
cd harry
```

### 2. Create virtual environment

```bash
python -m venv venv
venv\Scripts\activate     # Windows
source venv/bin/activate  # Linux/Mac
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env with your OpenCode Zen API key
```

### 5. Run

```bash
python run.py
```

Open **http://localhost:8000** in your browser (Chrome/Edge recommended for voice).

## 🏗️ Project Structure

```
harry/
├── app/
│   ├── main.py          # FastAPI application
│   ├── api/             # API route handlers
│   ├── ai/              # AI provider layer
│   ├── core/            # Config and exceptions
│   ├── db/              # Database layer
│   └── memory/          # Memory management
├── static/
│   ├── css/style.css    # Premium dark UI
│   └── js/
│       ├── app.js       # Main application logic
│       └── voice.js     # Voice system (STT/TTS)
├── templates/
│   └── index.html       # SPA shell
├── data/                # SQLite database (auto-created)
├── .env.example         # Environment template
├── requirements.txt     # Python dependencies
├── run.py               # Entry point
└── README.md
```

## 🔑 API Keys

Get your free API key from [OpenCode Zen](https://opencode.ai/auth).

## 📄 License

MIT License
