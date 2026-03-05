FROM node:22-alpine

WORKDIR /app

# Copiamos desde la ruta correcta dentro del contexto del monorepo
COPY apps/server/package*.json ./
RUN npm install

# Copiamos el servidor y el shared
COPY apps/server/src ./src
COPY packages/shared ../packages/shared

EXPOSE 8080

CMD ["npm", "run", "dev"]