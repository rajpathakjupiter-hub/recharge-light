#!/bin/bash
cd /opt/rechargelight
echo "Y" | npx eas-cli build --platform android --profile apk 2>&1 | tee /opt/rechargelight/build.log
