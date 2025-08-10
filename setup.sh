#!/bin/bash

# Zzyra Development Environment Setup Script
# This script helps set up the development environment for Zzyra

# Color codes for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Zzyra Development Environment Setup ===${NC}"
echo "This script will set up your development environment for Zzyra."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create Docker network if it doesn't exist
echo -e "${YELLOW}Creating Docker network...${NC}"
docker network create zzyra 2>/dev/null || true
echo -e "${GREEN}Docker network created or already exists.${NC}"

# Start Docker containers
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker compose -f setup-compose.yml up -d
echo -e "${GREEN}Docker containers started.${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install || yarn install
echo -e "${GREEN}Dependencies installed.${NC}"

# Set up environment variables
echo -e "${YELLOW}Setting up environment variables...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOL
# Database
DATABASE_URL="postgresql://zzyra:zzyra@localhost:5432/zzyra?schema=public"

# JWT
JWT_SECRET="your-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="1d"
REFRESH_TOKEN_EXPIRES_IN="7"

# Redis
REDIS_URL="redis://localhost:6379"

# Ollama
OLLAMA_URL="http://localhost:11434"
EOL
    echo -e "${GREEN}.env file created.${NC}"
else
    echo -e "${GREEN}.env file already exists.${NC}"
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
cd packages/database && npx prisma generate
echo -e "${GREEN}Prisma client generated.${NC}"

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
cd packages/database && npx prisma migrate dev --name init
echo -e "${GREEN}Database migrations applied.${NC}"

echo -e "${GREEN}=== Setup Complete ===${NC}"
echo "You can now start developing with Zzyra!"
echo "Run 'npm run dev' to start the development server."
