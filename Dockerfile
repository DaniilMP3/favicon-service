FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose service port
EXPOSE 3000

# Runtime environment variable for auth
# Pass AUTH_TOKEN when running the container
CMD ["node", "index.js"]

