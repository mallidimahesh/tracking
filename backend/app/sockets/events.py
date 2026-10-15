import logging
from flask import request
from flask_socketio import emit
from app.extensions import socketio
from app.models.shuttle import Shuttle

logger = logging.getLogger(__name__)

def register_socket_events():
    @socketio.on("connect")
    def handle_connect():
        client_sid = request.sid
        logger.info(f"Socket.IO client connected: {client_sid}")
        # Send instant initial snapshot upon connection
        shuttles = Shuttle.query.order_by(Shuttle.shuttle_code.asc()).all()
        snapshot = [s.to_dict(include_driver_details=False) for s in shuttles]
        emit("initial_state", {"shuttles": snapshot})

    @socketio.on("disconnect")
    def handle_disconnect():
        logger.info(f"Socket.IO client disconnected: {request.sid}")

    @socketio.on("request_sync")
    def handle_request_sync():
        shuttles = Shuttle.query.order_by(Shuttle.shuttle_code.asc()).all()
        snapshot = [s.to_dict(include_driver_details=False) for s in shuttles]
        emit("fleet_sync", {"shuttles": snapshot})

    @socketio.on("ping")
    def handle_ping():
        emit("pong", {"status": "ok"})
