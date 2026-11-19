FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/config.local.js.template /opt/aerotrack/config.local.js.template
COPY docker/20-aerotrack-config.sh /docker-entrypoint.d/20-aerotrack-config.sh

COPY index.html manifest.json service-worker.js config.js /usr/share/nginx/html/
COPY JS /usr/share/nginx/html/JS
COPY assets /usr/share/nginx/html/assets
COPY css /usr/share/nginx/html/css
COPY data /usr/share/nginx/html/data

RUN chmod +x /docker-entrypoint.d/20-aerotrack-config.sh \
    && rm -f /usr/share/nginx/html/config.local.js

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
