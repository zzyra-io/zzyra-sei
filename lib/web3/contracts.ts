import { ethers } from "ethers"

// ERC-20 Token ABI (minimal)
export const ERC20_ABI = [
  // Read-only functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",

  // Write functions
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint amount)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
]

// Sample contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet
  "0x1": {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  // Goerli Testnet
  "0x5": {
    USDC: "0x07865c6e87b9f70255377e024ace6630c1eaa37f",
    DAI: "0x73967c6a0904aa032c103b4104747e88c566b1a2",
    WETH: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  },
  // Polygon Mainnet
  "0x89": {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  },
}

// Helper function to get contract instance
export const getContract = (address: string, abi: any, provider: ethers.providers.Provider | ethers.Signer) => {
  return new ethers.Contract(address, abi, provider)
}

// Helper function to get token contract
export const getTokenContract = (
  tokenSymbol: string,
  chainId: string,
  provider: ethers.providers.Provider | ethers.Signer,
) => {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
  if (!addresses) {
    throw new Error(`No contract addresses found for chain ID ${chainId}`)
  }

  const tokenAddress = addresses[tokenSymbol as keyof typeof addresses]
  if (!tokenAddress) {
    throw new Error(`No address found for token ${tokenSymbol} on chain ID ${chainId}`)
  }

  return getContract(tokenAddress, ERC20_ABI, provider)
}

// Helper function to get token balance
export const getTokenBalance = async (
  tokenSymbol: string,
  chainId: string,
  address: string,
  provider: ethers.providers.Provider,
) => {
  try {
    const contract = getTokenContract(tokenSymbol, chainId, provider)
    const balance = await contract.balanceOf(address)
    const decimals = await contract.decimals()

    // Format the balance with proper decimals
    return ethers.utils.formatUnits(balance, decimals)
  } catch (error) {
    console.error("Error getting token balance:", error)
    throw error
  }
}

// Helper function to send tokens
export const sendTokens = async (
  tokenSymbol: string,
  chainId: string,
  recipient: string,
  amount: string,
  signer: ethers.Signer,
) => {
  try {
    const contract = getTokenContract(tokenSymbol, chainId, signer)
    const decimals = await contract.decimals()

    // Parse the amount with proper decimals
    const parsedAmount = ethers.utils.parseUnits(amount, decimals)

    // Send the transaction
    const tx = await contract.transfer(recipient, parsedAmount)

    // Wait for the transaction to be mined
    return await tx.wait()
  } catch (error) {
    console.error("Error sending tokens:", error)
    throw error
  }
}
