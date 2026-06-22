# Сборка поверх базового образа ubi8-base-smart-anketa-ui (корневой Dockerfile).
# База содержит node_modules; исходники подмешиваем из build context, иначе CI
# собирает код из зафиксированного в базе снимка и кеширует RUN без инвалидации.
# Тег базы должен совпадать с apps/react-client/Dockerfile и корневым Dockerfile.
#
# CI: docker build . -f apps/nestjs-server/Dockerfile -t smart-anketa-api:tag

ARG BASE_IMAGE=docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v3.1.0
FROM ${BASE_IMAGE} AS build-deps

WORKDIR /app

COPY apps/nestjs-server /app/apps/nestjs-server
COPY packages/api-contract /app/packages/api-contract
COPY packages/json-logic-ts /app/packages/json-logic-ts

RUN npm --prefix packages/api-contract run build \
	&& npm --prefix packages/json-logic-ts run build

WORKDIR /app/apps/nestjs-server
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
