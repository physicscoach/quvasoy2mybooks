from http.server import BaseHTTPRequestHandler, HTTPServer


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        # Django shu tarzda javob beradi: faylni O'ZI bermaydi,
        # faqat ruxsat berib, Caddy'ga qaysi faylni uzatishni aytadi.
        self.send_response(200)
        self.send_header("X-Accel-Redirect", "/books/test.bin")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, *a):
        pass


HTTPServer(("0.0.0.0", 9000), H).serve_forever()
