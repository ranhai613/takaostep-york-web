import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoStoreHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("MYSTERY_PORT", "4173"))
    with ThreadingHTTPServer(("localhost", port), NoStoreHandler) as server:
        print(f"Development server: http://localhost:{port}/")
        server.serve_forever()
