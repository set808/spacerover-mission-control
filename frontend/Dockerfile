FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV REACT_APP_API_URL=http://localhost:4000

EXPOSE 3000

CMD ["npm", "start"]
