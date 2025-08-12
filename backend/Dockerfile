FROM node:20-alpine

WORKDIR /app

# Install dependencies separately for better caching
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copy source
COPY src ./src

EXPOSE 4000

CMD ["npm", "run", "dev"]


