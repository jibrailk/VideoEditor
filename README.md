# VideoEditor

A zero-budget-first, open-source AI video editing studio. The first milestone is a dependable browser-based editing workflow that produces real MP4 files with FFmpeg. AI-assisted editing and daily Hindi/Hinglish content generation will build on this foundation.

## MVP features

- Responsive web interface that works on laptop and phone
- Upload a source video
- Set start and end trim points in seconds
- Choose landscape (16:9), portrait (9:16), or square (1:1) output
- Optional SRT subtitles
- Background rendering with progress updates
- Download the rendered MP4
- Docker setup with FFmpeg included

## Run with Docker (recommended)

Requirements: Docker and Docker Compose.

```bash
docker compose up --build
```

Open http://localhost:8000.

The application stores temporary projects in `./data`. Keep this directory out of version control. Uploaded videos and renders can be large, so ensure the machine has enough disk space.

## Run locally with Python

Requirements: Python 3.11+ and FFmpeg/ffprobe installed and available on PATH.

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then open http://localhost:8000.

## Current limitations

- Rendering runs on the machine hosting the app. A GPU is not required for this FFmpeg-based MVP, but CPU renders can take time.
- Jobs and status are currently stored in memory. Restarting the server clears job status; use persistent storage and a queue before production deployment.
- This first version is a deterministic editor, not yet an autonomous AI director. No paid AI API is required for the current editing features.
- Do not expose the app publicly without authentication, upload limits, storage cleanup, and job isolation.

## API

- `GET /` - editor interface
- `GET /api/health` - health and FFmpeg availability
- `POST /api/jobs` - upload a video and start a render
- `GET /api/jobs/{job_id}` - render status
- `GET /api/jobs/{job_id}/download` - download completed MP4

## Roadmap

1. Validate real MP4 output and improve render reliability.
2. Add transcript-based cuts, silence detection, and word-level captions.
3. Add AI edit plans and chat-based revisions behind provider-neutral interfaces.
4. Add Hindi/Hinglish script generation, narration, scene planning, and daily production.
5. Add a persistent job queue, object storage, authentication, and deployment hardening.

## License

MIT. See [LICENSE](LICENSE).
