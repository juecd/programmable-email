# Use an official Node runtime as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript project
RUN npm run build

# Make the built index.js executable
RUN chmod +x ./build/index.js

# Define the command to run your app
CMD ["node", "./build/index.js"]