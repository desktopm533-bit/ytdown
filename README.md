# MediaDrop V2 — Render Ready

Production-oriented starter for downloading **authorized direct media URLs**. It intentionally does not implement YouTube downloading or bypass platform restrictions.

## V2 features
- Premium responsive UI
- Analyze direct media URLs
- Format selection
- Download progress using streaming progress events
- Recent download history in browser localStorage
- Drag/paste-friendly URL input
- Dark mode
- API rate limiting and SSRF protection
- Optional Redis/Valkey + BullMQ worker architecture
- Docker + Render Blueprint
- Automatic cleanup design
- FFmpeg available in the worker image for authorized processing

## Fast path
For a first deployment, the web service can stream original media directly. This is fastest when no transcoding is required.

## Worker path
For expensive jobs (for example, authorized transcoding), enable `REDIS_URL` and run the worker. Render Key Value is Redis-compatible/Valkey-based and is suitable for job queues. Render recommends background workers for long-running media processing.

## Local
Backend:
```bash
cd backend && npm install && npm run dev
```
Frontend:
```bash
cd frontend && npm install && npm run dev
```
Worker:
```bash
cd worker && npm install && npm run dev
```

## Docker
```bash
docker compose up --build
```

## Render
Push this repository to GitHub and create a Render Blueprint from `render.yaml`.

The Blueprint defines:
- public web service
- background worker
- Key Value queue

For the lowest-cost first test, you can remove the worker/keyvalue resources from the Blueprint and use the web service only.

## Environment variables
`MAX_FILE_MB=500`
`DOWNLOAD_TIMEOUT_MS=30000`
`ALLOWED_HOSTS=` optional comma-separated allowlist
`REDIS_URL=` supplied by Render Key Value when worker architecture is enabled

## API
POST `/api/inspect`
```json
{"url":"https://example.com/video.mp4"}
```

POST `/api/download`
```json
{"url":"https://example.com/video.mp4","format":"original"}
```

GET `/api/health`

Only use URLs for content you own or are authorized to download.
