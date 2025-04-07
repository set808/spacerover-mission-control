FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV API_URL=http://api:4000
ENV SCENARIO=default
ENV INTENSITY=medium

CMD ["node", "generator.js"]
