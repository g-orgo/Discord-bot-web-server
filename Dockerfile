FROM node:22-slim

# Required by mongodb-memory-server — download binary during image build
ENV MONGOMS_DOWNLOAD_DIR=/app/.mongodb-binaries

# libcurl4 is required by the MongoDB binary
RUN apt-get update && apt-get install -y --no-install-recommends libcurl4 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Pre-download MongoDB binary at build time so the first startup is fast
RUN node --input-type=module --eval "import { MongoBinary } from 'mongodb-memory-server-core'; await MongoBinary.getPath(); console.log('[docker] MongoDB binary ready');"

COPY app.js ./
COPY src/ ./src/

VOLUME ["/app/data"]

EXPOSE 3001

CMD ["node", "app.js"]
