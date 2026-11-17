#!/bin/sh
set -eu

if [ -f /opt/aerotrack/runtime-config.local.js ]; then
  cp /opt/aerotrack/runtime-config.local.js /usr/share/nginx/html/config.local.js
  exit 0
fi

: "${MAPBOX_ACCESS_TOKEN:=}"
: "${MAPBOX_STYLE:=mapbox://styles/mapbox/outdoors-v12}"
: "${ADSB_RAPIDAPI_KEY:=}"

export MAPBOX_ACCESS_TOKEN MAPBOX_STYLE ADSB_RAPIDAPI_KEY

envsubst '${MAPBOX_ACCESS_TOKEN} ${MAPBOX_STYLE} ${ADSB_RAPIDAPI_KEY}' \
  < /opt/aerotrack/config.local.js.template \
  > /usr/share/nginx/html/config.local.js
