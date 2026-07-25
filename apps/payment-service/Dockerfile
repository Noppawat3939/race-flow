FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml tsconfig.json ./
RUN corepack enable && yarn install --immutable
COPY src ./src
RUN yarn build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
CMD ["node", "dist/src/main.js"]
