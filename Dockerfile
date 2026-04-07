FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY app.js ./

EXPOSE 3001

CMD ["node", "app.js"]
