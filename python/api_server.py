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
from socketserver import ThreadingMixIn
from urllib.parse import parse_qs, urlparse

# Threaded HTTP Server for handling concurrent requests
class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""
    daemon_threads = True

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_to_json import AIToJSON
from json_to_docx import JSONToDocx

# Global AI generator instance
_generator = None

def get_generator():
    global _generator
    if _generator is None:
        try:
            _generator = AIToJSON()
            if not _generator.client:
                print("❌ AI generator failed to initialize - no OpenAI client")
                raise Exception("Failed to initialize AI generator: No OpenAI client available")
            print("✅ AI generator initialized successfully")
        except Exception as e:
            print(f"❌ Error initializing AI generator: {e}")
            raise Exception(f"Failed to initialize AI generator: {e}")
    return _generator


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
            response_data = {
                'status': 'ok',
                'model': 'gpt-5-mini-2025-08-07'
            }
            response_json = json.dumps(response_data, ensure_ascii=False)
            response_bytes = response_json.encode('utf-8')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(response_bytes)))
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(response_bytes)
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        try:
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
                print(f"❌ Error in {parsed.path}: {e}")
                import traceback
                traceback.print_exc()
                self._send_error(500, str(e))
        except Exception as e:
            print(f"❌ Critical error in do_POST: {e}")
            try:
                self._send_error(500, f"Server error: {e}")
            except:
                # Last resort - send basic error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Server error'}).encode())
    
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
        
        # Convert to JSON
        json_str = json.dumps(data, ensure_ascii=False)
        json_bytes = json_str.encode('utf-8')
        
        # Set content length
        self.send_header('Content-Length', str(len(json_bytes)))
        self.end_headers()
        
        # Send in chunks for large responses (64KB chunks)
        chunk_size = 65536
        for i in range(0, len(json_bytes), chunk_size):
            chunk = json_bytes[i:i+chunk_size]
            try:
                self.wfile.write(chunk)
                self.wfile.flush()
            except Exception as e:
                print(f"❌ Error sending chunk: {e}")
                break

    
    def _handle_generate(self, data):
        """Generate RPS content via OpenAI."""
        generate_type = data.get('type', 'full')  # full, cpl, cpmk, weeklyPlan, references
        course_name = data.get('courseName', 'Mata Kuliah')
        course_code = data.get('courseCode', 'MK001')
        sks = data.get('sks', 3)
        semester = data.get('semester', 1)
        status = data.get('status', 'Mata Kuliah Wajib')
        prereq = data.get('prereq', '-')
        additional_context = data.get('additionalContext', '')
        
        # Additional data for partial generation
        deskripsi = data.get('deskripsiSingkat', '')
        cpl_list = data.get('cplList', [])
        cpmk_list = data.get('cpmkList', [])
        
        print(f"\n📝 Generating {generate_type.upper()} for: {course_name}")
        if additional_context:
            print(f"💡 Additional context provided ({len(additional_context)} chars)")
        
        generator = get_generator()
        
        # Handle different generation types
        if generate_type == 'cpl':
            result = generator.generate_cpl_json(
                course_name=course_name,
                course_code=course_code,
                sks=sks,
                semester=semester,
                deskripsi=deskripsi,
                additional_context=additional_context
            )
            if result:
                self._send_json({'success': True, 'data': {'cpl': result}})
            else:
                raise Exception("Failed to generate CPL")
        
        elif generate_type == 'cpmk':
            result = generator.generate_cpmk_json(
                course_name=course_name,
                course_code=course_code,
                sks=sks,
                semester=semester,
                deskripsi=deskripsi,
                cpl_list=cpl_list,
                additional_context=additional_context
            )
            if result:
                self._send_json({'success': True, 'data': {'cpmk': result}})
            else:
                raise Exception("Failed to generate CPMK")
        
        elif generate_type == 'weeklyPlan':
            result = generator.generate_weekly_plan_json(
                course_name=course_name,
                course_code=course_code,
                sks=sks,
                semester=semester,
                deskripsi=deskripsi,
                cpmk_list=cpmk_list,
                additional_context=additional_context
            )
            if result:
                self._send_json({'success': True, 'data': {'minggu': result}})
            else:
                raise Exception("Failed to generate Weekly Plan")
        
        elif generate_type == 'references':
            result = generator.generate_references_json(
                course_name=course_name,
                course_code=course_code,
                additional_context=additional_context
            )
            if result:
                self._send_json({'success': True, 'data': {'referensi': result}})
            else:
                raise Exception("Failed to generate References")
        
        else:  # full generation
            rps_data = generator.generate_rps_json(
                course_name=course_name,
                course_code=course_code,
                sks=sks,
                semester=semester,
                status=status,
                prereq=prereq,
                additional_context=additional_context
            )
            
            if not rps_data:
                raise Exception("Failed to generate RPS content")
            
            print(f"✅ Generated RPS with {len(rps_data.get('minggu', []))} weeks")
            self._send_json({'success': True, 'data': rps_data})
    
    def _handle_export(self, data):
        """Export RPS to DOCX."""
        print("\n📄 Starting DOCX export...")
        rps_data = data.get('rpsData', {})
        meta = data.get('meta', {})
        
        # Debug: Log received meta
        print(f"📋 Received meta keys: {list(meta.keys())}")
        print(f"   - koordinatorMK: {meta.get('koordinatorMK')}")
        print(f"   - koordinatorGPM: {meta.get('koordinatorGPM')}")
        print(f"   - ketuaProdi: {meta.get('ketuaProdi')}")
        print(f"   - dekan: {meta.get('dekan')}")
        
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
            # Use JSONToDocx converter
            converter = JSONToDocx(template_path=str(template_path))
            success = converter.export_to_docx(
                rps_data=rps_data,
                meta=meta,
                output_path=output_path
            )
            
            if not success:
                raise Exception("Failed to export DOCX")
            
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
    server_address = ('127.0.0.1', port)
    httpd = ThreadedHTTPServer(server_address, RPSAPIHandler)
    print(f"🚀 RPS API Server running on http://127.0.0.1:{port} (localhost only)")
    print("=" * 50)
    print("Endpoints:")
    print(f"  GET  http://localhost:{port}/health")
    print(f"  POST http://localhost:{port}/generate")
    print(f"  POST http://localhost:{port}/export")
    print("=" * 50)
    print("🔄 Multi-threaded mode: Ready for concurrent requests")
    httpd.serve_forever()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5000)
    args = parser.parse_args()
    run_server(args.port)
