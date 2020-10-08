FROM node:alpine

# Change working directory for npm and node
WORKDIR /workdir
# Create working directory and public directory
RUN mkdir -p /workdir/public

# Prepare env for NodeJs
COPY package.json /workdir
COPY package-lock.json /workdir
RUN npm install

# Copy the codes
COPY app.js /workdir
COPY routes /workdir/routes

CMD ["node", "app.js"]
