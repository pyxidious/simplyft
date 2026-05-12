FROM node:20-alpine AS build

WORKDIR /app/simplyft

COPY simplyft/package*.json ./
RUN npm ci --foreground-scripts || \
    (npm cache clean --force && rm -rf node_modules && sleep 2 && npm ci --foreground-scripts)

COPY simplyft/ ./
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/simplyft/dist/simplyft/browser /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=10 CMD wget -qO- http://127.0.0.1:8080/ || exit 1
