#!/usr/bin/env python3
"""Development server for IDGAF Tracker.

WHY THIS EXISTS INSTEAD OF `python3 -m http.server`

The stdlib server sends `Last-Modified` but no `Cache-Control` at all. With no
explicit freshness directive, browsers fall back to *heuristic caching* — they
invent a lifetime (commonly 10% of the age of the document) and reuse the file
without revalidating.

The result during development is a genuinely confusing failure: you edit
`css/styles.css`, reload, and see the old styling. It does not present as a
caching problem. It presents as "my change did not work", or worse, as a
half-stale mix where new JS calls a function that the cached old JS does not
define, so buttons throw ReferenceError and silently do nothing.

That cost several rounds of debugging on this project. This server sends
no-store on everything, so a reload always reflects what is on disk.

Production is unaffected: GitHub Pages sends proper caching headers, and the
service worker deliberately keeps its cache-first strategy there so the app
opens instantly and works offline.

Usage:
    python3 serve.py [port]        # defaults to 8137
"""

import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8137
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler that forbids all caching."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Quieter than the default: skip the 200s, surface anything that is not.
        status = str(args[1]) if len(args) > 1 else ""
        if not status.startswith("2"):
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True     # avoids "Address already in use" on restart
    daemon_threads = True


if __name__ == "__main__":
    with Server(("", PORT), NoCacheHandler) as httpd:
        print(f"IDGAF Tracker  →  http://localhost:{PORT}")
        print("Serving with caching disabled. Ctrl-C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
