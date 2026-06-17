# Сборка поверх базового образа ubi8-base-smart-anketa-ui (корневой Dockerfile).
# В базе уже лежит /app с монорепо и node_modules — COPY из build context не нужен.
#
# CI: docker build . -f Dockerfile -t smart-anketa-frontend:tag

FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v3.1.0 AS build-deps

WORKDIR /app

RUN npm --prefix packages/api-contract run build \
	&& npm --prefix packages/json-logic-ts run build

WORKDIR /app/apps/react-client
RUN npm run build:webpack

FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/nginx:1.20.2

COPY --from=build-deps /app/apps/react-client/dist /usr/share/nginx/html
COPY --from=build-deps /app/apps/react-client/default.conf /etc/nginx/conf.d/default.conf
RUN chgrp -R root /var/cache/nginx /var/run /var/log/nginx && \
	chmod -R 770 /var/cache/nginx /var/run /var/log/nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
