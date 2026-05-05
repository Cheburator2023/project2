# Base Image
FROM docker.repo-ci.sfera.inno.local/sumd-docker-lib/ubi8-base-smart-anketa-ui:v1.0.5 as build-deps

# build nestjs-server
COPY . ./
COPY packages/api-contract ./node_modules/@smart-anketa/api-contract
RUN npm --prefix ./node_modules/@smart-anketa/api-contract run build
RUN npm run build

EXPOSE 3000

# ENV NODE_ENV=production

# Start up command
CMD ["npm","run","start"]