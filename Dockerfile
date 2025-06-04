FROM node:20 AS builder

WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

COPY package.json package-lock.json ./
RUN npm pkg delete scripts.prepare

COPY . .

RUN npm install

RUN npm run build


FROM node:20 AS runner

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules

COPY --from=builder /usr/src/app/apps/nestjs-server/dist ./dist

COPY --from=builder /usr/src/app/apps/nestjs-server/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/main"]
