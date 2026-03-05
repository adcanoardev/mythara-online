FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host es obligatorio para que Vite sea accesible fuera del contenedor
CMD ["npm", "run", "dev", "--", "--host"]