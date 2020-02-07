FROM node:alpine

WORKDIR /workdir
RUN mkdir -p /workdir/public

COPY package.json /workdir
COPY package-lock.json /workdir
RUN npm install

COPY app.js /workdir
COPY routes /workdir/routes

CMD ["node", "app.js"]
