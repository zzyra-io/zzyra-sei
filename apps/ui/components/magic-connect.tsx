// src/app/components/ConnectButton.tsx

import { useMagic } from "@/lib/magic-provider"


const MagicConnectButton = () => {
  // Get the initializeWeb3 function from the Web3 context
  const { magic } = useMagic()

  // Define the event handler for the button click
  const handleConnect = async () => {
    try {
      // Try to connect to the wallet using Magic's user interface
        await magic?.wallet.showUI()
    } catch (error) {
      // Log any errors that occur during the connection process
      console.error("handleConnect:", error)
    }
  }

  // Render the button component with the click event handler
  return (
    <button
      type="button"
      className="w-auto border border-white font-bold p-2 rounded-md"
      onClick={handleConnect}
    >
      Continue to dashboard
    </button>
  )
}

export default MagicConnectButton

