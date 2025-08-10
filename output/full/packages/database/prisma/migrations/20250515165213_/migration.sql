/*
  Warnings:

  - A unique constraint covering the columns `[wallet_address]` on the table `user_wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_wallet_address_key" ON "user_wallets"("wallet_address");
