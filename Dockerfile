FROM node:22-alpine

# Install ffmpeg for media processing
RUN apk add --no-cache ffmpeg

# Set working directory inside image
WORKDIR /app

# Copy only package files first (for better build cache)
COPY package*.json ./

# Install only production deps
RUN npm ci --omit=dev

# Copy built app files
COPY output/dist/ ./

# Use entrypoint to handle symlink and start app
CMD ["node", "index.js"]
