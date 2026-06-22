# Сборка поверх базового образа ubi8-base-smart-anketa-ui (корневой Dockerfile).
# База содержит node_modules; исходники подмешиваем из build context.
# Тег базы должен совпадать с apps/react-client/Dockerfile и корневым Dockerfile.
#
# Поддерживаются оба CI-варианта (автоопределение layout в RUN ниже):
#   docker build . -f apps/nestjs-server/Dockerfile           # контекст = корень монорепо
#   docker build . -f Dockerfile                              # контекст = apps/nestjs-server

ARG BASE_IMAGE=docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v3.1.0
FROM ${BASE_IMAGE} AS build-deps

WORKDIR /app

COPY . /tmp/build-context
RUN set -eux; \
	if [ -f /tmp/build-context/apps/nestjs-server/package.json ]; then \
		cp -a /tmp/build-context/apps/nestjs-server/. /app/apps/nestjs-server/; \
		cp -a /tmp/build-context/packages/api-contract/. /app/packages/api-contract/; \
		cp -a /tmp/build-context/packages/json-logic-ts/. /app/packages/json-logic-ts/; \
	elif [ -f /tmp/build-context/package.json ]; then \
		cp -a /tmp/build-context/. /app/apps/nestjs-server/; \
	else \
		echo "Unsupported Docker build context for nestjs-server." >&2; \
		echo "Use monorepo root or apps/nestjs-server as build context." >&2; \
		exit 1; \
	fi; \
	rm -rf /tmp/build-context

RUN npm --prefix packages/api-contract run build \
	&& npm --prefix packages/json-logic-ts run build

WORKDIR /app/apps/nestjs-server
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
