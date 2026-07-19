FROM node:22 AS frontend-bau
WORKDIR /bau
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/ ./backend/
COPY --from=frontend-bau /bau/dist ./frontend/dist
ENV DATEN_VERZEICHNIS=/app/data
EXPOSE 8080
CMD ["node", "backend/src/server.js"]
