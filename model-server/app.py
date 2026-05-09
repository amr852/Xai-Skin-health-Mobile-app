"""Flask application factory for the skin lesion AI service."""

from __future__ import annotations

import os

from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient

import config
from routes.legacy import legacy_bp
from routes.scan import scan_bp


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    mongo_client = MongoClient(config.MONGO_URI)
    db = mongo_client[config.DB_NAME]
    app.config["RESULTS_COL"] = db["skin_analysis_results"]
    app.config["SCAN_SESSIONS_COL"] = db["scan_sessions"]

    app.register_blueprint(legacy_bp)
    app.register_blueprint(scan_bp)

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
