"""
===================================================================
 NutriViet ScAllergen & Sadie's Link Smart Glasses - Master Launcher
===================================================================
 Khoi chay toan bo he thong:
 1. Backend FastAPI Service: http://localhost:8000 (Swagger docs: http://localhost:8000/docs)
 2. Frontend Web App:        http://localhost:3000 (Liquid Glassmorphic UI)
 3. Vision Studio Streamer:  http://localhost:3000/streamer/ hoac file index.html
===================================================================
"""

import os
import sys

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import threading
import time
import webbrowser
import uvicorn
import http.server
import socketserver

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "ScAllergen-Backend", "server")
FRONTEND_DIR = os.path.join(ROOT_DIR, "ScAllergen-Backend", "web")
STREAMER_DIR = os.path.join(ROOT_DIR, "webcam-wokwi-streamer")

# Add server directory to sys.path so main.py and database.py can resolve modules
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

FRONTEND_PORT = 3000
BACKEND_PORT = 8000

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        # Route /streamer to webcam-wokwi-streamer folder
        if self.path.startswith("/streamer"):
            streamer_rel = self.path[len("/streamer"):]
            if not streamer_rel or streamer_rel == "/":
                streamer_rel = "/index.html"
            target_path = os.path.join(STREAMER_DIR, streamer_rel.lstrip("/"))
            if os.path.isfile(target_path):
                self.send_response(200)
                if target_path.endswith(".html"):
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                elif target_path.endswith(".js"):
                    self.send_header("Content-Type", "application/javascript")
                elif target_path.endswith(".css"):
                    self.send_header("Content-Type", "text/css")
                self.end_headers()
                with open(target_path, "rb") as f:
                    self.wfile.write(f.read())
                return
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

def run_backend():
    print(f"[*] [Backend] Khoi dong FastAPI tren http://localhost:{BACKEND_PORT}")
    import main as backend_app
    uvicorn.run(backend_app.app, host="0.0.0.0", port=BACKEND_PORT, log_level="info")

def run_frontend():
    print(f"[*] [Frontend] Khoi dong Web App tren http://localhost:{FRONTEND_PORT}")
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", FRONTEND_PORT), CustomHTTPHandler) as httpd:
        httpd.serve_forever()

if __name__ == "__main__":
    print("=" * 65)
    print("  NUTRI-VIET SCALLERGEN & SADIE'S LINK - MASTER LAUNCHER")
    print("=" * 65)
    print(f"  * Web Application:     http://localhost:{FRONTEND_PORT}")
    print(f"  * Backend API Service: http://localhost:{BACKEND_PORT}")
    print(f"  * API Swagger Docs:    http://localhost:{BACKEND_PORT}/docs")
    print(f"  * Vision Studio:       http://localhost:{FRONTEND_PORT}/streamer/")
    print("=" * 65)

    # Start backend thread
    t_backend = threading.Thread(target=run_backend, daemon=True)
    t_backend.start()

    # Wait a moment for backend to initialize
    time.sleep(1.5)

    # Automatically open the browser
    try:
        webbrowser.open(f"http://localhost:{FRONTEND_PORT}")
    except Exception:
        pass

    # Run frontend on main thread
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\n[*] Da dung toan bo dich vu.")
        sys.exit(0)
