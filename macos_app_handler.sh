#!/bin/bash

# Configuration
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.server.pid"
LOG_FILE="$PROJECT_DIR/storage/logs/macos_app.log"

# Add Homebrew and local paths for macOS
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$PROJECT_DIR"

start_servers() {
    # 1. Prevent duplicate servers
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null; then
            osascript -e 'display notification "JobAssistant is already running." with title "JobAssistant"'
            open "http://127.0.0.1:8000"
            exit 0
        fi
        rm "$PID_FILE"
    fi

    echo "$(date): Starting servers..." >> "$LOG_FILE"

    # 2. Start Laravel Backend (PID 1)
    php artisan serve --port=8000 > /dev/null 2>&1 &
    PHP_PID=$!

    # 3. Start Vite Frontend (PID 2)
    npm run dev > /dev/null 2>&1 &
    VITE_PID=$!

    # 4. Save PIDs to file for cleanup
    echo "$PHP_PID $VITE_PID" > "$PID_FILE"
    
    # Save the wrapper's own PID for the closure loop
    echo "$$" >> "$PID_FILE"

    # 5. Wait for boot and open browser
    sleep 3
    open "http://127.0.0.1:8000"
    
    osascript -e 'display notification "Servers started successfully." with title "JobAssistant" subtitle "Ready at 127.0.0.1:8000"'

    # 6. Keep script alive to hold the Dock icon
    # This loop ensures the script doesn't exit until signaled
    while true; do
        sleep 1
    done
}

stop_servers() {
    echo "$(date): Stopping servers..." >> "$LOG_FILE"
    
    if [ -f "$PID_FILE" ]; then
        read PHP_PID VITE_PID WRAPPER_PID < "$PID_FILE"
        
        # Kill the child processes
        kill "$PHP_PID" 2>/dev/null
        kill "$VITE_PID" 2>/dev/null
        
        # Additional safety: pkill based on command names to be thorough
        pkill -f "php artisan serve --port=8000" > /dev/null 2>&1
        pkill -f "node.*vite" > /dev/null 2>&1
        
        rm "$PID_FILE"
        
        osascript -e 'display notification "Servers stopped cleanly." with title "JobAssistant"'
    fi
}

# Lifecycle handling
trap stop_servers SIGINT SIGTERM EXIT

case "$1" in
    start)
        start_servers
        ;;
    stop)
        stop_servers
        ;;
    *)
        start_servers
        ;;
esac
