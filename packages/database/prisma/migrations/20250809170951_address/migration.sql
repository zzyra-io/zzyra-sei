-- AlterTable
ALTER TABLE "session_keys" ADD COLUMN     "parent_delegation_signature" TEXT,
ADD COLUMN     "parent_wallet_address" TEXT,
ADD COLUMN     "smart_wallet_owner" TEXT;
