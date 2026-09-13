# 🎧 YouTube Audio Converter API

> Developed with precision by **Alperen Sümeroğlu** — turning YouTube audio into clean, downloadable MP3s with elegance.

A high-performance Flask API that transforms any public YouTube video into a high-quality MP3 audio file — instantly, securely, and reliably. Powered by `yt-dlp` and `FFmpeg`, this API handles downloading, conversion, and secure delivery through expiring token-based access. Designed for developers, content tools, automation pipelines, and all who need clean audio from video sources — fast.

---

## 📚 Table of Contents
1. [Features](#-features)
2. [Installation](#-installation)
3. [Example Usage](#-example-usage)
4. [API Endpoints](#-api-endpoints)
5. [Internals (How It Works)](#️-internals-how-it-works)
6. [Tech Stack](#-tech-stack)
7. [Ideal For](#-ideal-for)
8. [Author](#-author)
9. [Weekly Rewind](#-weekly-rewind-tech-ai--entrepreneurship)
10. [License](#-license)

---

## 🌟 Features
- 🔗 Accepts any public YouTube URL
- 🎵 Downloads best audio using `yt-dlp`
- ✨ Converts audio to high-quality `.mp3` via `FFmpeg`
- 🔐 Returns a one-time secure token to download the file
- ⏱️ Tokens expire automatically (default: 5 mins)
- 🧹 Expired files are auto-deleted (clean disk usage)
- 🚀 Built for fast local or cloud deployment

---

## 📦 Installation

### Requirements & Launch
Required packages are listed in [`requirements.txt`](./requirements.txt). To install all of them simply run:
```bash
pip install -r requirements.txt
```

Make sure FFmpeg is installed on your system:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

Clone and run the project:
```bash
git clone https://github.com/alperensumeroglu/yt-audio-api.git
cd yt-audio-api
python3 main.py
```

---

## 📗 Example Usage
### Step 1: Request Token
```
GET /?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```
Response:
```json
{
  "token": "CGIroH6G-8JDL3DllsUhM6_CfYc"
}
```

### Step 2: Download Audio
```
GET /download?token=CGIroH6G-8JDL3DllsUhM6_CfYc
```
Result: `yourfile.mp3` will download automatically 🎶

---

## 🔄 API Endpoints
| Method | Route         | Description                                  |
|--------|---------------|----------------------------------------------|
| GET    | `/`           | Accepts `?url=<video_url>`, returns token    |
| GET    | `/download`   | Accepts `?token=<token>`, returns audio file |

---

## ⚖️ Internals (How It Works)
- Downloads audio using `yt-dlp`
- Converts it to `.mp3` using FFmpeg (192kbps)
- Stores audio in `/downloads` directory
- Generates expiring token for each file
- A background daemon removes expired tokens/files

---

## 📊 Tech Stack
- Python 3.8+
- Flask 2.x
- yt-dlp
- FFmpeg

---

## 🤝 Ideal For
- Developers building podcast/audio tools
- Automation pipelines for archiving
- Students & hobbyists learning API development

---

## 👤 Author
**Alperen Sümeroğlu**  
Computer Engineer • Entrepreneur • Global Explorer 🌍  
15+ European countries explored ✈️ 

- 🔗 [LinkedIn](https://www.linkedin.com/in/alperensumeroglu/)
- 🧠 [LeetCode](https://leetcode.com/u/alperensumeroglu/)
- 🚀 [daily.dev](https://app.daily.dev/alperensumeroglu)

> “Let your code be as clean as the audio you deliver.”

---

## 🗓 Weekly Rewind: Tech, AI & Entrepreneurship

> 🚀 What does it take to grow as a Computer Engineering student, build projects, and explore global innovation?

This API is part of a bigger journey I share in **Weekly Rewind** — my real-time documentary **podcast series**, where I reflect weekly on coding breakthroughs, innovation insights, startup stories, and lessons from around the world.

### 💡 What is Weekly Rewind?
A behind-the-scenes look at real-world experiences, global insights, and hands-on learning. Each episode includes:

- 🔹 Inside My Coding & Engineering Projects
- 🔹 Startup Ideas & Entrepreneurial Lessons
- 🔹 Trends in Tech & AI
- 🔹 Innovation from 15+ Countries
- 🔹 Guest Conversations with Builders & Engineers
- 🔹 Productivity, Learning & Growth Strategies

### 🌍 Redefining Learning
> “True learning isn’t confined to tutorials — it comes from building real projects, exploring the world, and sharing the story.”

### 🎧 Listen Now:
- 🎙 [Spotify](https://open.spotify.com/show/3Lc5ofiXh93wYI8Sx7MFCK)
- ▶️ [YouTube](https://www.youtube.com/playlist?list=PLSN_hxkfsxbbd_qD87kn1SVvnR41IbuGc)
- ✍️ [Medium](https://medium.com/@alperensumeroglu)
- 💼 [LinkedIn](https://www.linkedin.com/company/weekly-rewind-tech-ai-entrepreneurship-podcast/)

> This is not just a podcast — it’s a journey of building, sharing, and scaling real-world impact.

---

## 📆 License
MIT License — free for personal and commercial use.
