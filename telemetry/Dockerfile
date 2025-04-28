FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN mkdir -p logs

COPY newrelic.js ./

COPY . .

ENV NODE_ENV=development
ENV PORT=6000
ENV MONGODB_URI=mongodb://mongodb:27017/spacerover
ENV LOG_LEVEL=info
ARG NEW_RELIC_LICENSE_KEY
ENV NEW_RELIC_LICENSE_KEY=$NEW_RELIC_LICENSE_KEY
ENV NEW_RELIC_APP_NAME=SpaceRover-TelemetryProcessor
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV ENABLE_SIMULATION=true

EXPOSE 6000

ENTRYPOINT ["node", "-r", "newrelic", "server.js"]
