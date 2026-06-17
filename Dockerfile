# Базовый образ монорепозитория: исходники + npm install.
# Публикуется как ubi8-base-smart-anketa-ui (тег задаётся в CI).
#
#   docker build -f Dockerfile -t docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v3.1.0 .
#
# Дальше smart-anketa-frontend / smart-anketa-api собираются из apps/*/Dockerfile
# без COPY из build context — только RUN поверх этого образа.

FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-python39-npm:1.2 AS build-deps

WORKDIR /app
COPY . /app/

RUN npm i --force
