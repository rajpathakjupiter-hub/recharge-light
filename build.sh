#!/bin/bash
cd /opt/pay2hub
echo "Y" | npx eas-cli build --platform android --profile apk 2>&1 | tee /opt/pay2hub/build.log
