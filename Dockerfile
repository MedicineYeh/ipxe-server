FROM node:alpine

# Create working directory and public directory
RUN mkdir -p /workdir/public

# Prepare env for NodeJs
COPY package.json /workdir
COPY package-lock.json /workdir
RUN npm install

# Copy the codes
COPY app.js /workdir
COPY routes /workdir/routes

WORKDIR /workdir
CMD ["node", "app.js"]
