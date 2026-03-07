# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
# This step is optimized for caching: if package.json doesn't change, 
# npm install won't re-run in subsequent builds
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application source code to the container
COPY . .

# Expose port 8080 to the outside world
EXPOSE 8080

# Command to run the application when the container starts
CMD ["node", "app.js"]
