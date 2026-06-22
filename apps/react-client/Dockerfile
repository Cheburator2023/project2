# Сборка поверх базового образа ubi8-base-smart-anketa-ui (корневой Dockerfile).
# База содержит node_modules; исходники подмешиваем из build context, иначе CI
# собирает код из зафиксированного в базе снимка и кеширует RUN без инвалидации.
#
# CI: docker build . -f apps/react-client/Dockerfile -t smart-anketa-frontend:tag

FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v3.1.0 AS build-deps

WORKDIR /app

COPY apps/react-client /app/apps/react-client
COPY packages/api-contract /app/packages/api-contract
COPY packages/json-logic-ts /app/packages/json-logic-ts
COPY packages/ag-grid-enterprise /app/packages/ag-grid-enterprise

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
