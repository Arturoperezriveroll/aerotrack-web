FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/config.local.js.template /opt/aerotrack/config.local.js.template
COPY docker/20-aerotrack-config.sh /docker-entrypoint.d/20-aerotrack-config.sh

COPY . /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/20-aerotrack-config.sh \
    && rm -f /usr/share/nginx/html/config.local.js

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
