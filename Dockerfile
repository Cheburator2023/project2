FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-python39-npm:1.2 as build-deps

# ARG NPM_REGISTRY
# ARG NPM_EMAIL
# ARG NPM_AUTH

WORKDIR /app
COPY . /app/

RUN npm i --force