#!/bin/bash
# Script to prepare a deployment package for Oracle Cloud

# Exit on error
set -e

echo "=== Preparing Zyra Worker Deployment Package ==="

# Create deployment directory
DEPLOY_DIR="./deployment-package"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy necessary files
echo "Copying source files..."
cp -r ./src $DEPLOY_DIR/
cp -r ./deploy-scripts $DEPLOY_DIR/
cp package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json nest-cli.json $DEPLOY_DIR/

# Create .env.example if it doesn't exist
if [ ! -f ".env.example" ] && [ -f ".env" ]; then
  echo "Creating .env.example from .env..."
  cp .env .env.example
  # You may want to manually edit .env.example to remove sensitive information
fi

cp .env.example $DEPLOY_DIR/ || echo "Warning: .env.example not found. You'll need to create environment variables manually."

# Create README for deployment
cat > $DEPLOY_DIR/README.md << EOL
# Zyra Worker Deployment Package

This package contains everything needed to deploy the Zyra worker to Oracle Cloud Infrastructure.

## Quick Start

1. Upload this package to your Oracle Cloud instance
2. Extract the package: \`tar -xzf zyra-worker-deployment.tar.gz\`
3. Navigate to the extracted directory: \`cd deployment-package\`
4. Make the setup script executable: \`chmod +x deploy-scripts/setup.sh\`
5. Run the setup script: \`./deploy-scripts/setup.sh\`
6. Configure your environment variables in \`/opt/zyra-worker/.env\`

For detailed instructions, see \`deploy-scripts/ORACLE_CLOUD_DEPLOYMENT.md\`.
EOL

# Create a tar.gz archive
echo "Creating deployment archive..."
tar -czf ./zyra-worker-deployment.tar.gz -C $DEPLOY_DIR .

echo "=== Deployment Package Created: zyra-worker-deployment.tar.gz ==="
echo "Upload this file to your Oracle Cloud instance and follow the instructions in deploy-scripts/ORACLE_CLOUD_DEPLOYMENT.md"
