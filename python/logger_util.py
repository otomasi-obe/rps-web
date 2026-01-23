#!/usr/bin/env python3
"""
Logging utility for RPS system
Logs all requests, responses, and saves JSON exports
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path

# Create logs directory
LOGS_DIR = Path(__file__).parent.parent / 'logs'
EXPORTS_DIR = LOGS_DIR / 'exports'
LOGS_DIR.mkdir(exist_ok=True)
EXPORTS_DIR.mkdir(exist_ok=True)

# Setup file handlers with rotation
def setup_logger(name='rps_api'):
    """Setup logger with file and console handlers"""
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # File handler - daily log files
    today = datetime.now().strftime('%Y-%m-%d')
    log_file = LOGS_DIR / f'python_api_{today}.log'
    
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# Global logger instance
logger = setup_logger()

def log_request(endpoint, data, client_ip='unknown'):
    """Log incoming request"""
    logger.info(f"📥 REQUEST | {endpoint} | IP: {client_ip}")
    logger.debug(f"Request data keys: {list(data.keys()) if isinstance(data, dict) else type(data)}")

def log_response(endpoint, status, duration_ms, error=None):
    """Log response"""
    if error:
        logger.error(f"❌ RESPONSE | {endpoint} | {status} | {duration_ms:.0f}ms | Error: {error}")
    else:
        logger.info(f"✅ RESPONSE | {endpoint} | {status} | {duration_ms:.0f}ms")

def log_timing(label, duration_ms):
    """Log timing information"""
    logger.info(f"⏱️  TIMING | {label}: {duration_ms:.2f}ms")

def save_export_json(rps_data, meta, filename_prefix='export'):
    """Save JSON data for export history"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    course_code = meta.get('kode', 'unknown').replace('/', '_')
    
    filename = f"{filename_prefix}_{course_code}_{timestamp}.json"
    filepath = EXPORTS_DIR / filename
    
    export_data = {
        'timestamp': datetime.now().isoformat(),
        'meta': meta,
        'rpsData': rps_data
    }
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        logger.info(f"💾 SAVED | Export JSON: {filename}")
        return str(filepath)
    except Exception as e:
        logger.error(f"❌ SAVE ERROR | Failed to save export JSON: {e}")
        return None

def log_performance_metrics(metrics):
    """Log performance metrics"""
    logger.info("📊 PERFORMANCE METRICS:")
    for key, value in metrics.items():
        if isinstance(value, (int, float)):
            logger.info(f"   {key}: {value:.2f}ms" if value > 100 else f"   {key}: {value:.2f}s")
        else:
            logger.info(f"   {key}: {value}")

def cleanup_old_logs(days_to_keep=7):
    """Cleanup log files older than specified days"""
    import time
    cutoff_time = time.time() - (days_to_keep * 86400)
    
    deleted_count = 0
    for log_file in LOGS_DIR.glob('*.log'):
        if log_file.stat().st_mtime < cutoff_time:
            try:
                log_file.unlink()
                deleted_count += 1
            except:
                pass
    
    if deleted_count > 0:
        logger.info(f"🧹 CLEANUP | Deleted {deleted_count} old log files")

# Run cleanup on import
cleanup_old_logs()
