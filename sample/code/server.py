# server.py — minimal HTTP server with routing

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import json


ROUTES = {}


def route(path, methods=("GET",)):
    def decorator(fn):
        for method in methods:
            ROUTES[(method.upper(), path)] = fn
        return fn
    return decorator


@route("/")
def index(handler, params):
    return {"status": "ok", "version": "1.0.0"}


@route("/echo", methods=("GET", "POST"))
def echo(handler, params):
    return {"method": handler.command, "params": params}


class Handler(BaseHTTPRequestHandler):
    def handle_request(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        fn = ROUTES.get((self.command, parsed.path))
        if fn is None:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(fn(self, params)).encode())

    do_GET = handle_request
    do_POST = handle_request

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")


if __name__ == "__main__":
    server = HTTPServer(("localhost", 8080), Handler)
    print("Listening on http://localhost:8080")
    server.serve_forever()
