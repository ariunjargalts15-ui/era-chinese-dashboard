#!/usr/bin/env python3
"""Development server for ERA Chinese.

Identical to `python -m http.server`, except every response says
`Cache-Control: no-store`. Without that the browser holds on to app.js and
app.css and you keep seeing the previous version after an edit.

    python serve.py            # http://localhost:4180
    python serve.py 8000       # another port
"""

import sys
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4180
ROOT = Path(__file__).resolve().parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))


def main():
    handler = partial(NoCacheHandler, directory=str(ROOT))
    server = HTTPServer(("127.0.0.1", PORT), handler)
    print("ERA Chinese on http://localhost:%d  (serving %s, caching off)" % (PORT, ROOT))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
