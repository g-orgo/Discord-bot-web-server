FROM node:22-alpine

# Required by mongodb-memory-server — download binary during image build
ENV MONGOMS_DOWNLOAD_DIR=/app/.mongodb-binaries

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY app.js ./

VOLUME ["/app/data"]

EXPOSE 3001

CMD ["node", "app.js"]
