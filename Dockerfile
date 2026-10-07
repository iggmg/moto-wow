FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server ./server
COPY shared ./shared
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 DATABASE_PATH=/data/moto-wow.sqlite COOKIE_SECURE=1
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8787
VOLUME /data
CMD ["node", "server/index.js"]
