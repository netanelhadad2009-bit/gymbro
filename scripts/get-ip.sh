#!/bin/bash

# Get the local IP address for development
# Tries en0 first (Wi-Fi), then en1 as fallback

IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)

if [ -z "$IP" ]; then
  echo "localhost"
else
  echo "$IP"
fi