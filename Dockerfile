FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 9999

ENV PORT=9999
ENV NODE_ENV=production
ENV DOCKWATCH_API_KEY=dockwatch

CMD ["node", "index.js"]
