import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.extensions import socketio

env = os.environ.get("FLASK_ENV", "development")
app = create_app(env)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"[*] VIT Shuttle Backend running on http://{host}:{port} in {env} mode (debug={debug})")
    socketio.run(app, host=host, port=port, debug=debug, allow_unsafe_werkzeug=True)
