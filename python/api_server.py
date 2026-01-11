#!/usr/bin/env python3
"""
RPS API Server
==============
HTTP API untuk integrasi dengan website Next.js.
Menangani generate konten dan export DOCX.

Usage:
    python api_server.py
    
Endpoints:
    POST /generate - Generate RPS content via OpenAI
    POST /export   - Export to DOCX
    GET  /health   - Health check
"""

import json
import os
import sys
import tempfile
import base64
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rps_generator_v2 import (
    get_rps_generation_prompt,
    parse_json_response,
    fill_docx_with_rps,
    _set_cell_text_preserve_format
)
from openai_bot import OpenAIBot

# Global bot instance
_bot = None

def get_bot():
    global _bot
    if _bot is None or not _bot.is_bot_ready():
        _bot = OpenAIBot()
        if not _bot.setup_driver():
            raise Exception("Failed to setup OpenAI client")
        if not _bot.open_openai():
            raise Exception("Failed to initialize OpenAI connection")
    return _bot


class RPSAPIHandler(BaseHTTPRequestHandler):
    
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'ok',
                'model': 'gpt-5-mini-2025-08-07'
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_error(400, 'Invalid JSON')
            return
        
        try:
            if parsed.path == '/generate':
                self._handle_generate(data)
            elif parsed.path == '/export':
                self._handle_export(data)
            else:
                self._send_error(404, 'Not found')
        except Exception as e:
            self._send_error(500, str(e))
    
    def _send_error(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode())
    
    def _send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())
    
    def _handle_generate(self, data):
        """Generate RPS content via OpenAI."""
        course_name = data.get('courseName', 'Mata Kuliah')
        course_code = data.get('courseCode', 'MK001')
        sks = data.get('sks', 3)
        semester = data.get('semester', 1)
        status = data.get('status', 'Mata Kuliah Wajib')
        prereq = data.get('prereq', '-')
        
        print(f"\n📝 Generating RPS for: {course_name}")
        
        bot = get_bot()
        prompt = get_rps_generation_prompt(course_name, course_code, sks, semester, status, prereq)
        
        response = bot.send_message(prompt)
        if not response:
            raise Exception("Empty response from OpenAI")
        
        rps_data = parse_json_response(response)
        
        print(f"✅ Generated RPS with {len(rps_data.get('minggu', []))} weeks")
        
        self._send_json({
            'success': True,
            'data': rps_data
        })
    
    def _handle_export(self, data):
        """Export RPS to DOCX."""
        rps_data = data.get('rpsData', {})
        meta = data.get('meta', {})
        
        # Ensure required fields
        if not meta.get('nama'):
            meta['nama'] = 'Mata Kuliah'
        if not meta.get('kode'):
            meta['kode'] = 'MK001'
        if not meta.get('sks'):
            meta['sks'] = 3
        if not meta.get('semester'):
            meta['semester'] = 1
        if not meta.get('status'):
            meta['status'] = 'Mata Kuliah Wajib'
        if not meta.get('prasyarat'):
            meta['prasyarat'] = '-'
        
        # Get template path
        script_dir = Path(__file__).parent
        template_path = script_dir / 'RPS.docx'
        
        if not template_path.exists():
            raise Exception(f"Template not found: {template_path}")
        
        # Create temp output file
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
            output_path = tmp.name
        
        try:
            fill_docx_with_rps(
                template_path=str(template_path),
                output_path=output_path,
                rps_data=rps_data,
                meta=meta
            )
            
            # Read file and encode as base64
            with open(output_path, 'rb') as f:
                docx_bytes = f.read()
            
            docx_base64 = base64.b64encode(docx_bytes).decode('utf-8')
            
            print(f"✅ Exported DOCX ({len(docx_bytes)} bytes)")
            
            self._send_json({
                'success': True,
                'docx': docx_base64,
                'filename': f"RPS_{meta['kode']}.docx"
            })
            
        finally:
            # Cleanup temp file
            if os.path.exists(output_path):
                os.remove(output_path)


def run_server(port=5000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, RPSAPIHandler)
    print(f"🚀 RPS API Server running on http://localhost:{port}")
    print("=" * 50)
    print("Endpoints:")
    print(f"  GET  http://localhost:{port}/health")
    print(f"  POST http://localhost:{port}/generate")
    print(f"  POST http://localhost:{port}/export")
    print("=" * 50)
    httpd.serve_forever()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5000)
    args = parser.parse_args()
    run_server(args.port)
