# Base Image
FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-frontend:v1.0.0 as build-deps

# build react-client
COPY . ./
RUN npm run build:webpack

# Phase 2 - Get the Build and host on nginx
FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/nginx:1.20.2
COPY --from=build-deps /app/dist /usr/share/nginx/html
# COPY app/template /usr/share/nginx/html/template
COPY default.conf /etc/nginx/conf.d/default.conf
RUN chgrp -R root /var/cache/nginx /var/run /var/log/nginx && \
    chmod -R 770 /var/cache/nginx /var/run /var/log/nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]