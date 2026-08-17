import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 3000
DIRECTORY = os.path.join(os.path.dirname(__file__), "web")

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    print(f"==================================================")
    print(f"  NutriViet ScAllergen Web App (Liquid Glass)")
    print(f"==================================================")
    print(f"  Serving web frontend at: http://localhost:{PORT}")
    print(f"  Target Backend API: http://localhost:8000")
    print(f"==================================================")
    
    # Try opening browser automatically
    webbrowser.open(f"http://localhost:{PORT}")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)
