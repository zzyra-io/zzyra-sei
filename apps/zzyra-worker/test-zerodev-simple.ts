import { ZeroDevService } from './src/services/zerodev.service';

// Load environment variables
require('dotenv').config();

async function testZeroDevFlow() {
  console.log('🧪 Starting ZeroDev flow test...');

  try {
    // Create ZeroDev service with proper config service mock
    const zeroDevService = new ZeroDevService({
      get: (key: string) => {
        // Return environment variables or fallback to defaults
        const envValue = process.env[key];
        if (envValue) return envValue;

        // Let the service use its own defaults for v3 API
        return undefined;
      },
    } as any);

    console.log('✅ ZeroDev service initialized successfully');

    // Test configuration
    const config = zeroDevService.getConfig();
    console.log('📋 ZeroDev Configuration:', {
      projectId: config.projectId,
      bundlerUrl: config.bundlerUrl,
      paymasterUrl: config.paymasterUrl,
      entryPointAddress: config.entryPointAddress,
    });

    // Test network config - use correct SEI testnet chain ID (1328)
    const chainId = 1328; // SEI testnet
    const networkConfig = zeroDevService.getNetworkConfig(chainId);
    console.log('🌐 Network Config:', {
      id: networkConfig.id,
      name: networkConfig.name,
      rpcUrls: networkConfig.rpcUrls.default.http[0],
    });

    // Test kernel account creation
    console.log('🏗️ Testing kernel account creation...');
    const testPrivateKey =
      '0x1234567890123456789012345678901234567890123456789012345678901234'; // Dummy key for testing

    try {
      const kernelClient = await zeroDevService.createKernelAccountV5(
        testPrivateKey,
        chainId, // Use correct SEI testnet chain ID
      );

      console.log('✅ Kernel client created successfully:', {
        address: kernelClient.account.address,
        hasSendUserOperation: typeof kernelClient.sendUserOperation,
        accountMethods: Object.keys(kernelClient.account),
      });

      // Test a simple transaction with a more realistic recipient
      console.log('📤 Testing simple transaction...');

      // Use a more realistic recipient address (SEI testnet contract or address)
      const recipientAddress = '0x1234567890123456789012345678901234567890';

      try {
        const result = await zeroDevService.executeSimpleTransaction(
          kernelClient,
          recipientAddress,
          '0', // 0 value
          chainId, // Use correct SEI testnet chain ID
        );

        console.log('✅ Transaction executed successfully:', result);
      } catch (txError) {
        console.error('❌ Transaction execution failed:', txError);

        // Log detailed error information for debugging
        if (txError instanceof Error) {
          console.error(`Error name: ${txError.name}`);
          console.error(`Error message: ${txError.message}`);

          // Check if it's a bundler error
          if (
            txError.message.includes('bundler') ||
            txError.message.includes('RPC')
          ) {
            console.error('🔍 This appears to be a bundler/RPC issue');
            console.error('💡 Possible causes:');
            console.error('   - SEI testnet RPC endpoint issue');
            console.error('   - Gas estimation problems');
            console.error('   - ZeroDev project configuration issue');
            console.error('   - Network congestion or maintenance');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error during kernel account test:', error);

      // Log detailed error information
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}`);
        console.error(`Error message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
    }
  } catch (error) {
    console.error('❌ Fatal error in test:', error);

    if (error instanceof Error) {
      console.error(`Error name: ${error.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    console.log('🏁 Test completed');
    process.exit(0);
  }
}

// Run the test
testZeroDevFlow().catch((error) => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
