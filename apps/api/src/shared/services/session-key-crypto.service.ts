import { Injectable, Logger } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

/**
 * Service for session key encryption and decryption
 * Following TypeScript guidelines and NestJS patterns
 */
@Injectable()
export class SessionKeyCryptoService {
  private readonly logger = new Logger(SessionKeyCryptoService.name);
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltLength = 32;

  /**
   * Encrypt session private key using user's signature as password
   */
  async encryptSessionKey(
    privateKey: string,
    userSignature: string
  ): Promise<string> {
    try {
      // Generate random salt and IV
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);

      // Derive key from user signature using scrypt
      const scryptAsync = promisify(scrypt);
      const key = (await scryptAsync(
        userSignature,
        salt,
        this.keyLength
      )) as Buffer;

      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);

      // Encrypt the private key
      let encrypted = cipher.update(privateKey, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine salt, iv, tag, and encrypted data
      const result = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, "hex"),
      ]).toString("base64");

      this.logger.debug("Session key encrypted successfully");
      return result;
    } catch (error) {
      this.logger.error("Failed to encrypt session key", error);
      throw new Error("Encryption failed");
    }
  }

  /**
   * Decrypt session private key using user's signature as password
   */
  async decryptSessionKey(
    encryptedData: string,
    userSignature: string
  ): Promise<string> {
    try {
      // Parse the encrypted data
      const combined = Buffer.from(encryptedData, "base64");

      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(
        this.saltLength,
        this.saltLength + this.ivLength
      );
      const tag = combined.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = combined.subarray(
        this.saltLength + this.ivLength + this.tagLength
      );

      // Derive key from user signature
      const scryptAsync = promisify(scrypt);
      const key = (await scryptAsync(
        userSignature,
        salt,
        this.keyLength
      )) as Buffer;

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt the private key
      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");

      this.logger.debug("Session key decrypted successfully");
      return decrypted;
    } catch (error) {
      this.logger.error("Failed to decrypt session key", error);
      throw new Error("Decryption failed");
    }
  }

  /**
   * Generate session key pair with proper wallet address derivation
   * FIXED: Generate actual wallet address from private key
   */
  async generateSessionKeyPair(): Promise<{
    address: string;
    privateKey: string;
  }> {
    try {
      // Generate a proper 32-byte private key
      const privateKeyBytes = randomBytes(32);
      const privateKey = `0x${privateKeyBytes.toString('hex')}`;
      
      // Use ethers for address derivation (available in this package)
      const { ethers } = await import('ethers');
      const wallet = new ethers.Wallet(privateKey);
      const address = wallet.address;
      
      this.logger.debug("Session key pair generated successfully", {
        address,
      });
      
      return { 
        address, 
        privateKey 
      };
    } catch (error) {
      this.logger.error("Failed to generate session key pair", error);
      throw new Error("Key generation failed");
    }
  }

  /**
   * Validate session key format and integrity
   */
  validateSessionKey(sessionKey: string): boolean {
    try {
      // Basic validation - check if it's a valid hex string of expected length
      const isValidHex = /^[0-9a-fA-F]+$/.test(sessionKey);
      const hasValidLength = sessionKey.length === 64; // 32 bytes = 64 hex chars

      return isValidHex && hasValidLength;
    } catch (error) {
      this.logger.error("Session key validation failed", error);
      return false;
    }
  }

  /**
   * Generate secure nonce for session key
   */
  generateNonce(): bigint {
    try {
      // Generate 8 bytes (64-bit) random nonce
      const buffer = randomBytes(8);

      // Convert to bigint
      let nonce = BigInt(0);
      for (let i = 0; i < buffer.length; i++) {
        nonce = (nonce << BigInt(8)) | BigInt(buffer[i]);
      }

      return nonce;
    } catch (error) {
      this.logger.error("Failed to generate nonce", error);
      throw new Error("Nonce generation failed");
    }
  }

  /**
   * Hash delegation message for signature verification
   */
  hashDelegationMessage(message: Record<string, unknown>): string {
    try {
      const crypto = require("crypto");
      const messageString = JSON.stringify(
        message,
        Object.keys(message).sort()
      );

      return crypto.createHash("sha256").update(messageString).digest("hex");
    } catch (error) {
      this.logger.error("Failed to hash delegation message", error);
      throw new Error("Message hashing failed");
    }
  }

  /**
   * Verify signature against message hash
   * Note: This is a simplified implementation
   * In production, use proper ECDSA signature verification
   */
  verifySignature(
    message: Record<string, unknown>,
    signature: string,
    expectedAddress: string
  ): boolean {
    try {
      // This is a placeholder implementation
      // In real implementation, you would:
      // 1. Hash the message
      // 2. Recover the public key from signature
      // 3. Derive address from public key
      // 4. Compare with expected address

      const messageHash = this.hashDelegationMessage(message);

      // For now, just validate that signature and message are not empty
      const isValidSignature = Boolean(signature && signature.length > 0);
      const isValidMessage = Boolean(messageHash && messageHash.length > 0);
      const isValidAddress = Boolean(
        expectedAddress && expectedAddress.length > 0
      );

      this.logger.debug("Signature verification completed", {
        messageHash: messageHash.substring(0, 8) + "...",
        signatureLength: signature.length,
        expectedAddress: expectedAddress.substring(0, 8) + "...",
      });

      return isValidSignature && isValidMessage && isValidAddress;
    } catch (error) {
      this.logger.error("Signature verification failed", error);
      return false;
    }
  }
}
