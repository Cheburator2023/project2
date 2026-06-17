# Сборка поверх базового образа ubi8-base-smart-anketa-ui (корневой Dockerfile).
# В базе уже лежит /app с монорепо и node_modules — COPY из build context не нужен.
# Тег базы должен совпадать с apps/react-client/Dockerfile и корневым Dockerfile.
#
# CI: docker build . -f Dockerfile -t smart-anketa-api:tag

ARG BASE_IMAGE=docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v3.1.0
FROM ${BASE_IMAGE} AS build-deps

WORKDIR /app

RUN npm --prefix packages/api-contract run build \
	&& npm --prefix packages/json-logic-ts run build

WORKDIR /app/apps/nestjs-server
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
