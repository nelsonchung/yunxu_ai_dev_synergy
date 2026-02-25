# Download and setup the Node.js 22.x repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js (this includes npm)
sudo apt-get install -y nodejs

# Enable corepack
sudo corepack enable

# Prepare the specific version
corepack prepare pnpm@10.4.1 --activate
