FROM node:20-alpine

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
