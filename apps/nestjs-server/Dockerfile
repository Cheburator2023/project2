# Сборка поверх базового образа ubi8-base-smart-anketa-ui (корневой Dockerfile).
# В базе уже лежит /app с монорепо и node_modules — COPY из build context не нужен.
#
# CI: docker build . -f Dockerfile -t smart-anketa-api:tag

FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v1.0.5 AS build-deps

WORKDIR /app

RUN npm --prefix packages/api-contract run build \
	&& npm --prefix packages/json-logic-ts run build

WORKDIR /app/apps/nestjs-server
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
