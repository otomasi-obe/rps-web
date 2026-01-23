#!/bin/bash
# Log viewer script for RPS system

echo "==================================="
echo "  RPS Logging System - Log Viewer"
echo "==================================="
echo ""

# Function to show menu
show_menu() {
    echo "Choose log to view:"
    echo "  1) Python API logs (real-time)"
    echo "  2) Next.js logs (need: npm run dev)"
    echo "  3) Recent export JSONs"
    echo "  4) All logs summary"
    echo "  5) Performance stats"
    echo "  q) Quit"
    echo ""
}

# Function to show Python logs
show_python_logs() {
    LOG_FILE=$(ls -t /root/rps-web/logs/python_api_*.log 2>/dev/null | head -1)
    if [ -f "$LOG_FILE" ]; then
        echo "📊 Python API Logs (press Ctrl+C to stop):"
        echo "==========================================="
        tail -f "$LOG_FILE"
    else
        echo "❌ No Python logs found"
    fi
}

# Function to show export JSONs
show_exports() {
    echo "📁 Recent Export JSONs:"
    echo "======================"
    ls -lht /root/rps-web/logs/exports/*.json 2>/dev/null | head -10
    echo ""
    echo "Total exports: $(ls /root/rps-web/logs/exports/*.json 2>/dev/null | wc -l)"
}

# Function to show summary
show_summary() {
    echo "📊 Logs Summary:"
    echo "==============="
    echo ""
    echo "Python Logs:"
    ls -lh /root/rps-web/logs/python_api_*.log 2>/dev/null || echo "  No Python logs"
    echo ""
    echo "Next.js Logs:"
    ls -lh /root/rps-web/logs/nextjs_api_*.log 2>/dev/null || echo "  No Next.js logs"
    echo ""
    echo "Export JSONs:"
    echo "  Count: $(ls /root/rps-web/logs/exports/*.json 2>/dev/null | wc -l)"
    echo "  Total size: $(du -sh /root/rps-web/logs/exports/ 2>/dev/null | cut -f1)"
}

# Function to show performance stats
show_performance() {
    echo "⏱️  Performance Statistics (Last 24h):"
    echo "======================================"
    LOG_FILE=$(ls -t /root/rps-web/logs/python_api_*.log 2>/dev/null | head -1)
    if [ -f "$LOG_FILE" ]; then
        echo ""
        echo "Export Timing (Python side):"
        grep "total_time_ms" "$LOG_FILE" | tail -10
        echo ""
        echo "File Sizes:"
        grep "file_size_mb" "$LOG_FILE" | tail -10
    else
        echo "❌ No logs available"
    fi
}

# Main loop
while true; do
    show_menu
    read -p "Your choice: " choice
    echo ""
    
    case $choice in
        1)
            show_python_logs
            ;;
        2)
            echo "ℹ️  Next.js logs are shown in 'npm run dev' console"
            echo "Run this command in another terminal:"
            echo "  cd /root/rps-web && npm run dev"
            ;;
        3)
            show_exports
            ;;
        4)
            show_summary
            ;;
        5)
            show_performance
            ;;
        q|Q)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    echo ""
done
