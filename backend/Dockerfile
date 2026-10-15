# Multi-stage or lightweight Python image for Flask-SocketIO Backend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    PORT=5000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn gevent

# Copy backend code
COPY . .

# Ensure instance directory for SQLite persistence exists
RUN mkdir -p /app/instance && chmod 777 /app/instance

# Expose backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Launch with gunicorn and gevent-websocket worker for persistent Socket.IO connections
CMD ["gunicorn", "--worker-class", "gevent", "--workers", "1", "--bind", "0.0.0.0:5000", "run:app"]
