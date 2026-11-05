#!/usr/bin/env python3
"""Dependency-free preview server (fallback when Vite is not installed).

    python tools/serve.py            -> http://127.0.0.1:8138/
    python tools/serve.py 9000       -> http://127.0.0.1:9000/

Serves ../site as the document root. ES modules, GLB models and root-absolute
paths (/assets/..., /work/...) require a real HTTP origin, not file://.
"""
import functools
import http.server
import mimetypes
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site"))

for ext, mime in {
    ".woff2": "font/woff2",
    ".otf": "font/otf",
    ".glb": "model/gltf-binary",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
}.items():
    mimetypes.add_type(mime, ext)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8138
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as srv:
        print(f"Rj Verceles portfolio running at http://127.0.0.1:{port}/")
        print(f"  all work : http://127.0.0.1:{port}/work/")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
