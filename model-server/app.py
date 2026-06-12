"""Flask application factory for the skin lesion AI service."""

from __future__ import annotations

import os

from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient

import config
from routes.legacy import legacy_bp
from routes.scan import scan_bp

# Reject absurdly large uploads before they hit the pipeline (bytes).
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "25"))

# Keep a down Mongo from stalling requests for the pymongo default 30 s.
MONGO_SELECTION_TIMEOUT_MS = int(os.environ.get("MONGO_SELECTION_TIMEOUT_MS", "5000"))


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

    mongo_client = MongoClient(
        config.MONGO_URI, serverSelectionTimeoutMS=MONGO_SELECTION_TIMEOUT_MS
    )
    db = mongo_client[config.DB_NAME]
    app.config["MONGO_CLIENT"] = mongo_client
    app.config["RESULTS_COL"] = db["skin_analysis_results"]
    app.config["SCAN_SESSIONS_COL"] = db["scan_sessions"]

    app.register_blueprint(legacy_bp)
    app.register_blueprint(scan_bp)

    @app.route("/health", methods=["GET"])
    def health():
        mongo_ok = False
        try:
            mongo_client.admin.command("ping")
            mongo_ok = True
        except Exception:
            mongo_ok = False
        return jsonify(
            {
                "ok": True,
                "model_name": config.MODEL_NAME,
                "model_arch": config.MODEL_ARCH,
                "num_classes": config.NUM_CLASSES,
                "img_size": config.IMG_SIZE,
                "tta": config.INFERENCE_TTA,
                "mongo": mongo_ok,
            }
        ), 200

    # JSON error responses — clients are programs, not browsers.
    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(413)
    def payload_too_large(_e):
        return jsonify({"error": f"Upload too large (limit {MAX_UPLOAD_MB} MB)"}), 413

    @app.errorhandler(500)
    def internal_error(_e):
        return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
