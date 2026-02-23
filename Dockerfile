FROM node:25-alpine

LABEL org.opencontainers.image.title="Dockwatch Agent" \
      org.opencontainers.image.description="Headless Docker monitoring agent with full REST API" \
      org.opencontainers.image.vendor="lusky3" \
      org.opencontainers.image.licenses="ISC" \
      org.opencontainers.image.source="https://github.com/lusky3/dockwatch-agent" \
      org.opencontainers.image.url="https://github.com/lusky3/dockwatch-agent" \
      org.opencontainers.image.documentation="https://github.com/lusky3/dockwatch-agent/blob/main/README.md"

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p /config/logs

EXPOSE 9999

VOLUME ["/config"]

ENV PORT=9999
ENV NODE_ENV=production
ENV DOCKWATCH_API_KEY=dockwatch
ENV DB_PATH=/config/dockwatch.db
ENV CONFIG_PATH=/config
ENV LOG_PATH=/config/logs

CMD ["node", "index.js"]
