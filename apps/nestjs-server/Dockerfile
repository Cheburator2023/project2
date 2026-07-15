# Сборка поверх базового образа ubi8-base-smart-anketa-ui (корневой Dockerfile).
# База содержит node_modules; исходники подмешиваем из build context.
#
# Dev (контекст = корень монорепо):
#   docker build . -f apps/nestjs-server/Dockerfile
#
# Transfer (контекст = apps/nestjs-server) — перед сборкой нужны packages в .ci-packages:
#   sh scripts/stage-docker-ci-packages.sh nestjs-server api-contract json-logic-ts
#   docker build . -f Dockerfile
#
# Альтернатива transfer: projDir = корень репо, dockerfilePath = apps/nestjs-server/Dockerfile

ARG BASE_IMAGE=docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v3.4.0
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
		if [ ! -d /tmp/build-context/.ci-packages/api-contract ]; then \
			echo "ERROR: app-only build is missing apps/nestjs-server/.ci-packages/" >&2; \
			echo "Run: sh scripts/stage-docker-ci-packages.sh nestjs-server api-contract json-logic-ts" >&2; \
			echo "Or build from monorepo root: docker build . -f apps/nestjs-server/Dockerfile" >&2; \
			exit 1; \
		fi; \
		cp -a /tmp/build-context/.ci-packages/api-contract/. /app/packages/api-contract/; \
		cp -a /tmp/build-context/.ci-packages/json-logic-ts/. /app/packages/json-logic-ts/; \
	else \
		echo "Unsupported Docker build context for nestjs-server." >&2; \
		exit 1; \
	fi; \
	rm -rf /tmp/build-context

RUN npm --prefix packages/api-contract run build \
	&& npm --prefix packages/json-logic-ts run build

WORKDIR /app/apps/nestjs-server
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
