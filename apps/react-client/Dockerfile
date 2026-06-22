# Сборка поверх базового образа ubi8-base-smart-anketa-ui (корневой Dockerfile).
# База содержит node_modules; исходники подмешиваем из build context.
#
# Поддерживаются оба CI-варианта (автоопределение layout в RUN ниже):
#   docker build . -f apps/react-client/Dockerfile          # контекст = корень монорепо
#   docker build . -f Dockerfile                            # контекст = apps/react-client

FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v3.1.0 AS build-deps

WORKDIR /app

COPY . /tmp/build-context
RUN set -eux; \
	if [ -f /tmp/build-context/apps/react-client/package.json ]; then \
		cp -a /tmp/build-context/apps/react-client/. /app/apps/react-client/; \
		cp -a /tmp/build-context/packages/api-contract/. /app/packages/api-contract/; \
		cp -a /tmp/build-context/packages/json-logic-ts/. /app/packages/json-logic-ts/; \
		cp -a /tmp/build-context/packages/ag-grid-enterprise/. /app/packages/ag-grid-enterprise/; \
	elif [ -f /tmp/build-context/package.json ]; then \
		cp -a /tmp/build-context/. /app/apps/react-client/; \
	else \
		echo "Unsupported Docker build context for react-client." >&2; \
		echo "Use monorepo root or apps/react-client as build context." >&2; \
		exit 1; \
	fi; \
	rm -rf /tmp/build-context

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
