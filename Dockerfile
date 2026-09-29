FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
ENV PORT=3000 DATA_DIR=/app/data NODE_ENV=production
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]
EXPOSE 3000
USER node
CMD ["node", "server.js"]
