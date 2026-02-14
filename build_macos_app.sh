#!/bin/bash

# Configuration
APP_NAME="JobAssistant"
PROJECT_DIR="/Users/christeenajose/Projects/Job_search_assistant"
HANDLER_SCRIPT="$PROJECT_DIR/macos_app_handler.sh"
APP_PATH="$PROJECT_DIR/$APP_NAME.app"

# 1. Create the AppleScript source
AS_SOURCE="
on run
    try
        do shell script \"$HANDLER_SCRIPT start > /dev/null 2>&1 &\"
    on error errMsg
        display dialog \"Error starting JobAssistant: \" & errMsg buttons {\"OK\"} default button \"OK\" with icon stop
    end try
end run

on quit
    try
        do shell script \"$HANDLER_SCRIPT stop\"
    on error errMsg
        display dialog \"Error stopping JobAssistant: \" & errMsg buttons {\"OK\"} default button \"OK\" with icon stop
    end try
    continue quit
end quit
"

# 2. Compile into a 'Stay Open' App
echo "Building $APP_NAME.app..."
# Remove old app if exists
rm -rf "$APP_PATH"
osacompile -s -o "$APP_PATH" -e "$AS_SOURCE"

# 3. Modify Info.plist to ensure it shows in Dock
defaults write "$APP_PATH/Contents/Info.plist" LSBackgroundOnly -bool false

echo "Success! $APP_NAME.app has been created in $PROJECT_DIR"
echo "You can now drag this app to your Dock or Applications folder."
