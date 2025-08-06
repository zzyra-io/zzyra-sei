// src/app/components/ConnectButton.tsx

import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";

const MagicConnectButton = () => {
  // Get the Dynamic context
  const { dynamicContext } = useDynamicAuth();

  // Define the event handler for the button click
  const handleConnect = async () => {
    try {
      // Try to connect to the wallet using Dynamic's user interface
      dynamicContext.setShowAuthFlow(true);
    } catch (error) {
      // Log any errors that occur during the connection process
      console.error("handleConnect:", error);
    }
  };

  // Render the button component with the click event handler
  return (
    <button
      type='button'
      className='w-auto border border-white font-bold p-2 rounded-md'
      onClick={handleConnect}>
      Continue to dashboard
    </button>
  );
};

export default MagicConnectButton;
