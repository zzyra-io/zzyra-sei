import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ZeroDevService } from './src/services/zerodev.service';
import { Logger } from '@nestjs/common';

async function testZeroDevFlow() {
  const logger = new Logger('ZeroDevTest');

  try {
    logger.log('🧪 Starting ZeroDev flow test...');

    // Create a minimal app context for the test
    const app = await NestFactory.createApplicationContext({
      providers: [ConfigService, ZeroDevService],
    });

    const configService = app.get(ConfigService);
    const zeroDevService = app.get(ZeroDevService);

    logger.log('✅ Services initialized successfully');

    // Test configuration
    const config = zeroDevService.getConfig();
    logger.log('📋 ZeroDev Configuration:', {
      projectId: config.projectId,
      bundlerUrl: config.bundlerUrl,
      paymasterUrl: config.paymasterUrl,
      entryPointAddress: config.entryPointAddress,
    });

    // Test network config
    const networkConfig = zeroDevService.getNetworkConfig(713715);
    logger.log('🌐 Network Config:', {
      id: networkConfig.id,
      name: networkConfig.name,
      rpcUrls: networkConfig.rpcUrls.default.http[0],
    });

    // Test kernel account creation
    logger.log('🏗️ Testing kernel account creation...');
    const testPrivateKey =
      '0x1234567890123456789012345678901234567890123456789012345678901234'; // Dummy key for testing

    try {
      const kernelClient = await zeroDevService.createKernelAccountV5(
        testPrivateKey,
        713715, // SEI testnet
      );

      logger.log('✅ Kernel client created successfully:', {
        address: kernelClient.account.address,
        hasSendUserOperation: typeof kernelClient.sendUserOperation,
      });

      // Test a simple transaction
      logger.log('📤 Testing simple transaction...');
      const result = await zeroDevService.executeSimpleTransaction(
        kernelClient,
        '0x1234567890123456789012345678901234567890', // Dummy address
        '0', // 0 value
        713715,
      );

      logger.log('✅ Transaction executed successfully:', result);
    } catch (error) {
      logger.error('❌ Error during kernel account test:', error);

      // Log detailed error information
      if (error instanceof Error) {
        logger.error(`Error name: ${error.name}`);
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
      }
    }
  } catch (error) {
    logger.error('❌ Fatal error in test:', error);

    if (error instanceof Error) {
      logger.error(`Error name: ${error.name}`);
      logger.error(`Error message: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
    }
  } finally {
    logger.log('🏁 Test completed');
    process.exit(0);
  }
}

// Run the test
testZeroDevFlow().catch((error) => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
