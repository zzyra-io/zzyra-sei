#!/usr/bin/env npx tsx

import { createPublicClient, http, Address } from 'viem'
import { seiTestnet, baseSepolia, mainnet } from 'viem/chains'

// The address to investigate
const INVESTIGATE_ADDRESS = '0xA568181165F992afcdEEd98572a147C6a66C2AdE' as Address

// Chains to check
const CHAINS = [
  { name: 'Ethereum Mainnet', chain: mainnet },
  { name: 'SEI Testnet', chain: seiTestnet },
  { name: 'Base Sepolia', chain: baseSepolia },
]

async function investigateAddress(address: Address) {
  console.log('🔍 Investigating address:', address)
  console.log('=' * 60)

  for (const { name, chain } of CHAINS) {
    console.log(`\n📡 Checking ${name} (Chain ID: ${chain.id})`)
    console.log('-'.repeat(40))
    
    try {
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      })

      // Get balance
      const balance = await publicClient.getBalance({ address })
      console.log(`💰 Balance: ${balance} wei (${Number(balance) / 1e18} ETH)`)

      // Get transaction count (nonce)
      const transactionCount = await publicClient.getTransactionCount({ address })
      console.log(`📊 Transaction Count: ${transactionCount}`)

      // Check if it's a contract (has bytecode)
      const bytecode = await publicClient.getBytecode({ address })
      const isContract = bytecode && bytecode !== '0x'
      
      console.log(`🏗️  Contract Status: ${isContract ? 'DEPLOYED CONTRACT' : 'EOA (External Owned Account)'}`)
      
      if (isContract) {
        console.log(`📜 Bytecode Length: ${bytecode!.length} characters`)
        console.log(`📜 Bytecode Preview: ${bytecode!.substring(0, 100)}...`)
      } else {
        console.log(`📜 Bytecode: None (EOA or undeployed contract)`)
      }

      // Get recent transactions
      console.log(`🔄 Fetching recent transaction history...`)
      
      // Note: This might not work on all chains, so we'll wrap in try-catch
      try {
        // Get latest block number
        const latestBlock = await publicClient.getBlockNumber()
        console.log(`📦 Latest Block: ${latestBlock}`)
        
        // Check if address has any activity
        if (transactionCount > 0) {
          console.log(`✅ Address has transaction history`)
        } else if (balance > 0n) {
          console.log(`💡 Address has balance but no outgoing transactions (received funds only)`)
        } else {
          console.log(`❌ Address has no activity or balance`)
        }
      } catch (historyError) {
        console.log(`⚠️  Could not fetch transaction history: ${historyError}`)
      }

    } catch (error) {
      console.log(`❌ Error checking ${name}:`, error instanceof Error ? error.message : error)
    }
  }
}

// ZeroDev specific checks
async function checkZeroDevDeployment(address: Address) {
  console.log('\n🔧 ZeroDev Smart Account Analysis')
  console.log('=' * 40)
  
  // Check on SEI Testnet (your primary chain)
  const chain = seiTestnet
  console.log(`Checking ZeroDev deployment on ${chain.name}...`)
  
  try {
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    })

    const bytecode = await publicClient.getBytecode({ address })
    const isDeployed = bytecode && bytecode !== '0x'
    
    console.log(`Smart Contract Status: ${isDeployed ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`)
    
    if (isDeployed) {
      console.log('This appears to be a deployed smart contract.')
      console.log('Contract bytecode exists on-chain.')
    } else {
      console.log('This is either:')
      console.log('  1. An EOA (regular wallet address)')
      console.log('  2. A deterministic smart account address that hasnt been deployed yet')
      console.log('  3. A smart account that will be deployed on first transaction')
    }

    // Check balance and transaction count
    const balance = await publicClient.getBalance({ address })
    const txCount = await publicClient.getTransactionCount({ address })
    
    console.log(`\nAddress Activity:`)
    console.log(`  Balance: ${Number(balance) / 1e18} SEI`)
    console.log(`  Transactions: ${txCount}`)
    
    if (balance > 0n && txCount === 0) {
      console.log(`\n💡 INSIGHT: Address has received funds but never sent any transactions.`)
      console.log(`This suggests it might be a pre-funded smart account address that`)
      console.log(`hasn't been deployed yet, or an EOA that has only received funds.`)
    }

  } catch (error) {
    console.log(`Error in ZeroDev analysis:`, error)
  }
}

// Dynamic Labs integration analysis
function analyzeDynamicIntegration() {
  console.log('\n🔗 Dynamic Labs + ZeroDev Integration Analysis')
  console.log('=' * 50)
  
  console.log('Based on your code, Dynamic Labs is expected to:')
  console.log('  ✓ Automatically create ZeroDv smart accounts')
  console.log('  ✓ Handle deployment automatically')
  console.log('  ✓ Provide ready-to-use smart wallet addresses')
  
  console.log('\nPotential Issues:')
  console.log('  ⚠️  Dynamic might provide deterministic addresses without deploying contracts')
  console.log('  ⚠️  Deployment might happen on first transaction, not during account creation')
  console.log('  ⚠️  Your code assumes deployment is complete when it might not be')
  
  console.log('\nRecommendations:')
  console.log('  1. Always verify contract deployment before creating session keys')
  console.log('  2. Handle the case where address exists but contract is not deployed')
  console.log('  3. Implement proper deployment flow if Dynamic only provides addresses')
}

// Main execution
async function main() {
  console.log('🚀 Address Investigation Script')
  console.log('🎯 Target Address:', INVESTIGATE_ADDRESS)
  console.log('')
  
  await investigateAddress(INVESTIGATE_ADDRESS)
  await checkZeroDevDeployment(INVESTIGATE_ADDRESS)
  analyzeDynamicIntegration()
  
  console.log('\n' + '=' * 60)
  console.log('✅ Investigation Complete!')
  console.log('\nNext Steps:')
  console.log('1. Review the findings above')
  console.log('2. Determine if the address needs contract deployment')
  console.log('3. Fix the Dynamic/ZeroDv integration based on findings')
}

// Run the script
main().catch(console.error)