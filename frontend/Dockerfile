FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
# Note: In a real deploy, build arguments for NEXT_PUBLIC_ ENV vars would be needed here
# ARGs can be passed in docker-compose
RUN npm run build

# Expose Next.js default port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
