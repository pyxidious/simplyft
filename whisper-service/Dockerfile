FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --retries=10 CMD wget -qO- http://127.0.0.1:8001/health || exit 1

CMD ["node", "dist/index.js"]
