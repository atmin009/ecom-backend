# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
# Using npm install instead of npm ci to avoid integrity checksum issues
RUN npm install --legacy-peer-deps

# Copy TypeScript config
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
