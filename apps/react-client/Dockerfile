# Base Image
FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v3.0.0 as build-deps

# build react-client
COPY apps/react-client ./
COPY packages/api-contract ./node_modules/@smart-anketa/api-contract
COPY packages/json-logic-ts ./node_modules/@smart-anketa/json-logic-ts
COPY packages/ag-grid-enterprise ./node_modules/ag-grid-enterprise
RUN npm --prefix ./node_modules/@smart-anketa/api-contract run build
RUN npm --prefix ./node_modules/@smart-anketa/json-logic-ts run build
RUN npm run build:webpack

# Phase 2 - Get the Build and host on nginx
FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/nginx:1.20.2
COPY --from=build-deps /app/dist /usr/share/nginx/html
# COPY app/template /usr/share/nginx/html/template
COPY apps/react-client/default.conf /etc/nginx/conf.d/default.conf
RUN chgrp -R root /var/cache/nginx /var/run /var/log/nginx && \
    chmod -R 770 /var/cache/nginx /var/run /var/log/nginx
EXPOSE 8080

# Start up command
CMD ["nginx", "-g", "daemon off;"]