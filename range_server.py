"""Static file server with HTTP Range support (needed for video seeking).
Python's built-in http.server ignores the Range header and always returns the
whole file, which breaks currentTime-based video scrubbing once a clip is
larger than what the browser has already buffered.

Usage: python range_server.py <port> <directory>
"""
import http.server
import mimetypes
import os
import re
import sys

# Python no registra .apk por defecto (cae a application/octet-stream): algunos
# navegadores móviles abren ese tipo genérico en vez de descargarlo. Con el MIME
# correcto, el APK siempre se comporta como descarga.
mimetypes.add_type('application/vnd.android.package-archive', '.apk')


class RangeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        fs = os.fstat(f.fileno())
        file_len = fs.st_size
        range_header = self.headers.get('Range')

        if not range_header:
            self.send_response(200)
            self.send_header("Content-type", self.guess_type(path))
            self.send_header("Content-Length", str(file_len))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            # Servidor de desarrollo: los assets se sobreescriben todo el tiempo bajo la
            # misma URL (mismo nombre de archivo, contenido nuevo). Sin esto el navegador
            # sigue mostrando la versión vieja en caché tras editar un archivo, dando la
            # falsa impresión de que el cambio no se aplicó (o de que quedó un "vestigio").
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return f

        match = re.match(r'bytes=(\d*)-(\d*)', range_header)
        if not match or (match.group(1) == '' and match.group(2) == ''):
            self.send_error(416, "Requested Range Not Satisfiable")
            f.close()
            return None

        start_s, end_s = match.groups()
        if start_s == '':
            length = int(end_s)
            start = max(0, file_len - length)
            end = file_len - 1
        else:
            start = int(start_s)
            end = int(end_s) if end_s != '' else file_len - 1

        if start >= file_len or end >= file_len or start > end:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{file_len}")
            self.end_headers()
            f.close()
            return None

        self.send_response(206)
        self.send_header("Content-type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{file_len}")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

        f.seek(start)
        self._range_remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        remaining = getattr(self, '_range_remaining', None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        bufsize = 64 * 1024
        while remaining > 0:
            chunk = source.read(min(bufsize, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    directory = sys.argv[2] if len(sys.argv) > 2 else '.'
    os.chdir(directory)
    server = http.server.ThreadingHTTPServer(('', port), RangeHTTPRequestHandler)
    print(f"Serving {directory} on port {port} with HTTP Range support")
    server.serve_forever()
