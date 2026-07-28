FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx ng build --configuration production

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist/app/server ./server
COPY --from=build /app/dist/app/browser ./browser
EXPOSE 4000
CMD ["node", "server/server.mjs"]
