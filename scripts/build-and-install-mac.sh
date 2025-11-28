#!/bin/bash

set -e 

echo "Building..."
pnpm run build:mac

echo ""

APP_PATH="dist/mac-arm64/mediaplayer.app"

if [ ! -d "$APP_PATH" ]; then
    echo "Error: Built app not found at $APP_PATH"
    exit
fi

echo "Found app at: $APP_PATH"
echo ""
echo "Copying to /Applications..."

if [ -d "/Applications/mediaplayer.app" ]; then
    echo "Removing existing app..."
    rm -rf "/Applications/mediaplayer.app"
fi

cp -R "$APP_PATH" /Applications/

echo "Success!"