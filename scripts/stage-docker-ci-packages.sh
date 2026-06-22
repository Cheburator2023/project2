#!/bin/sh
# Кладёт workspace packages в apps/<app>/.ci-packages для Docker-сборки
# с контекстом apps/<app> (transfer-пайплайн: docker build . -f Dockerfile).
#
# Из корня репо:
#   sh scripts/stage-docker-ci-packages.sh nestjs-server api-contract json-logic-ts
#   sh scripts/stage-docker-ci-packages.sh react-client api-contract json-logic-ts ag-grid-enterprise
#
# В Jenkins (workspace = корень репо) перед runDockerBuild с projDir apps/*:
#   sh scripts/stage-docker-ci-packages.sh nestjs-server api-contract json-logic-ts

set -eu

APP="${1:?app name required (e.g. nestjs-server)}"
shift

if [ "$#" -eq 0 ]; then
	echo "At least one package name required (e.g. api-contract)" >&2
	exit 1
fi

ROOT="$(CDPATH= cd "$(dirname "$0")/.." && pwd)"
TARGET="${ROOT}/apps/${APP}/.ci-packages"

rm -rf "${TARGET}"
mkdir -p "${TARGET}"

for pkg in "$@"; do
	SRC="${ROOT}/packages/${pkg}"
	if [ ! -d "${SRC}" ]; then
		echo "Package not found: ${SRC}" >&2
		exit 1
	fi
	cp -a "${SRC}" "${TARGET}/"
done

echo "Staged packages for ${APP} -> apps/${APP}/.ci-packages/ ($*)"
