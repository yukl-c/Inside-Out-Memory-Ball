FROM node:25-alpine3.22
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install
CMD ["npm", "scr/service.js"]