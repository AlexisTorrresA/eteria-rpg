# Stage 1: compile the Three.js/Vite frontend.
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: lightweight Python runtime serving API + compiled game.
FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
EXPOSE 10000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
