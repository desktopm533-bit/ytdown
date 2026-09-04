FROM node:20-bookworm-slim AS build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=build /app/frontend/dist ./public
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node","src/server.js"]
