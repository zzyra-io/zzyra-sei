# Deploying Zzyra Worker to Oracle Cloud Infrastructure

This guide provides step-by-step instructions for deploying the Zzyra worker to an Oracle Cloud Infrastructure (OCI) Compute instance.

## Prerequisites

- Oracle Cloud Infrastructure account
- Access to the Zzyra worker codebase
- Basic knowledge of Linux commands

## Step 1: Create a Compartment (if not already created)

1. Open the Oracle Cloud Console
2. Navigate to **Identity & Security > Compartments**
3. Click **Create Compartment**
4. Enter a name and description for your compartment
5. Select the parent compartment (usually the root compartment)
6. Click **Create Compartment**

## Step 2: Create a Virtual Cloud Network (VCN)

1. Navigate to **Networking > Virtual Cloud Networks**
2. Click **Start VCN Wizard**
3. Select **Create VCN with Internet Connectivity**
4. Click **Start VCN Wizard**
5. Enter a name for your VCN
6. Select the compartment you created
7. Keep the default values for CIDR blocks and DNS settings
8. Click **Next** and then **Create** to create the VCN

## Step 3: Create a Compute Instance

1. Navigate to **Compute > Instances**
2. Click **Create Instance**
3. Enter a name for your instance
4. Select the compartment you created
5. Choose an Availability Domain
6. Select the following:
   - Image: Oracle Linux 8
   - Shape: VM.Standard.E4.Flex (or any shape that meets your requirements)
   - Virtual cloud network: Select the VCN you created
   - Subnet: Select the public subnet
   - Assign a public IP address: Yes
7. Upload your SSH public key or generate a new key pair
8. Click **Create** to launch the instance

## Step 4: Connect to Your Instance

1. Once the instance is running, note its public IP address
2. Connect to the instance using SSH:
   ```bash
   ssh -i <path-to-private-key> opc@<instance-public-ip>
   ```

## Step 5: Prepare the Instance

1. Update the system packages:
   ```bash
   sudo yum update -y
   ```
2. Install Git:
   ```bash
   sudo yum install -y git
   ```

## Step 6: Deploy the Zzyra Worker

1. Clone your repository (or upload the code to the instance):
   ```bash
   git clone <your-repo-url>
   cd zzyra/zzyra-worker
   ```
2. Make the setup script executable:
   ```bash
   chmod +x deploy-scripts/setup.sh
   ```
3. Run the setup script:
   ```bash
   ./deploy-scripts/setup.sh
   ```
4. The script will:
   - Install Node.js 20.x
   - Install pnpm and PM2
   - Set up the application in /opt/zzyra-worker
   - Configure the worker to start automatically on boot
   - Open the necessary firewall ports

## Step 7: Configure Environment Variables

1. Update the environment variables in the .env file:
   ```bash
   sudo nano /opt/zzyra-worker/.env
   ```
2. Modify the variables as needed for your production environment
3. Save the file and exit

## Step 8: Verify the Deployment

1. Check if the worker is running:
   ```bash
   pm2 status
   ```
2. View the logs:
   ```bash
   pm2 logs zzyra-worker
   ```
3. Test the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

## Step 9: Configure Security

1. Navigate to **Networking > Virtual Cloud Networks > [Your VCN] > Security Lists**
2. Click on the default security list for your VCN
3. Click **Add Ingress Rules**
4. Add a rule to allow traffic to port 3000:
   - Source CIDR: 0.0.0.0/0 (or restrict to specific IPs for better security)
   - IP Protocol: TCP
   - Destination Port Range: 3000
5. Click **Add Ingress Rules**

## Step 10: Set Up Monitoring

1. Navigate to **Observability & Management > Monitoring**
2. Create alarms for CPU utilization, memory usage, and other metrics
3. Set up notifications for these alarms

## Troubleshooting

- **Worker not starting**: Check the PM2 logs with `pm2 logs zzyra-worker`
- **Cannot connect to the worker**: Verify the security list rules and firewall settings
- **Environment variables issues**: Check the .env file in /opt/zzyra-worker

## Maintenance

- **Updating the worker**:
  ```bash
  cd /opt/zzyra-worker
  git pull
  pnpm install
  pnpm run build
  pm2 restart zzyra-worker
  ```
- **Viewing logs**:
  ```bash
  pm2 logs zzyra-worker
  ```
- **Restarting the worker**:
  ```bash
  pm2 restart zzyra-worker
  ```

## Best Practices

1. **Security**:
   - Restrict SSH access to specific IP addresses
   - Use strong passwords and key-based authentication
   - Regularly update the system and dependencies

2. **Backup**:
   - Regularly back up your configuration and data
   - Set up automated backups using Oracle Cloud Backup Service

3. **Monitoring**:
   - Set up monitoring for the instance and application
   - Configure alerts for critical events

4. **Scaling**:
   - Consider using an instance pool for horizontal scaling
   - Monitor resource usage and adjust instance shape as needed

5. **High Availability**:
   - Deploy instances across multiple availability domains
   - Use a load balancer to distribute traffic

## Additional Resources

- [Oracle Cloud Documentation](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
