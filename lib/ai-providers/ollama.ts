import type { AIProvider } from "@/lib/ai-provider"

export class OllamaProvider implements AIProvider {
  private baseUrl: string
  private model: string

  constructor(
    baseUrl = process.env.OLLAMA_API_URL || "http://localhost:11434",
    model = process.env.OLLAMA_MODEL || "llama3",
  ) {
    this.baseUrl = baseUrl
    this.model = model
  }

  async generateFlow(prompt: string, userId: string) {
    try {
      // Check if we have the required environment variables
      if (!this.baseUrl || !this.model) {
        console.warn("Missing Ollama configuration, falling back to mock data")
        return this.generateMockFlow(prompt)
      }

      // Try to call the Ollama API
      try {
        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            prompt: `Generate a Web3 automation workflow based on this description: ${prompt}. 
                    Return a JSON object with 'nodes' and 'edges' arrays that can be used in a React Flow diagram.`,
            stream: false,
          }),
        })

        // If the API call fails, fall back to mock data
        if (!response.ok) {
          console.warn(`Ollama API returned status ${response.status}, falling back to mock data`)
          return this.generateMockFlow(prompt)
        }

        const data = await response.json()

        // Try to parse the response as JSON
        try {
          // The Ollama response contains a 'response' field with the generated text
          const generatedText = data.response || ""

          // Try to extract JSON from the generated text
          const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const jsonStr = jsonMatch[0]
            const parsedData = JSON.parse(jsonStr)

            // Validate that the parsed data has the expected structure
            if (
              parsedData.nodes &&
              Array.isArray(parsedData.nodes) &&
              parsedData.edges &&
              Array.isArray(parsedData.edges)
            ) {
              return parsedData
            }
          }

          // If we couldn't parse valid JSON, fall back to mock data
          console.warn("Could not parse valid flow data from Ollama response, falling back to mock data")
          return this.generateMockFlow(prompt)
        } catch (parseError) {
          console.warn("Error parsing Ollama response:", parseError)
          return this.generateMockFlow(prompt)
        }
      } catch (apiError) {
        console.warn("Error calling Ollama API:", apiError)
        return this.generateMockFlow(prompt)
      }
    } catch (error) {
      console.error("Error in OllamaProvider.generateFlow:", error)
      // Always return a valid flow, even if there's an error
      return this.generateMockFlow(prompt)
    }
  }

  private generateMockFlow(prompt: string) {
    console.log("Generating mock flow for prompt:", prompt)

    // Basic node positions
    const startX = 100
    const startY = 100
    const xGap = 250
    const yGap = 150

    const nodes = []
    const edges = []
    const nodeId = 1

    // Create a more sophisticated mock flow based on the prompt
    const lowercasePrompt = prompt.toLowerCase()

    // Detect keywords in the prompt to customize the flow
    const hasWallet = lowercasePrompt.includes("wallet") || lowercasePrompt.includes("balance")
    const hasNotification = lowercasePrompt.includes("notif") || lowercasePrompt.includes("alert")
    const hasTransaction =
      lowercasePrompt.includes("transaction") ||
      lowercasePrompt.includes("transfer") ||
      lowercasePrompt.includes("send")
    const hasToken =
      lowercasePrompt.includes("token") || lowercasePrompt.includes("coin") || lowercasePrompt.includes("eth")
    const hasCondition =
      lowercasePrompt.includes("if") || lowercasePrompt.includes("when") || lowercasePrompt.includes("condition")

    // Create a trigger node based on the prompt
    if (hasWallet) {
      nodes.push({
        id: `node-${nodeId}`,
        type: "custom",
        position: { x: startX, y: startY },
        data: {
          label: "Wallet Trigger",
          icon: "wallet",
          description: "Monitor wallet balance",
        },
      })

      // Add a condition node if needed
      if (hasCondition) {
        nodes.push({
          id: `node-${nodeId + 1}`,
          type: "custom",
          position: { x: startX + xGap, y: startY },
          data: {
            label: "Balance Check",
            icon: "code",
            description: "Check if balance < 1 ETH",
          },
        })

        // Connect trigger to condition
        edges.push({
          id: `edge-${nodeId}-${nodeId + 1}`,
          source: `node-${nodeId}`,
          target: `node-${nodeId + 1}`,
          type: "default",
        })

        // Add action nodes based on the prompt
        let actionNodeId = nodeId + 2

        if (hasNotification) {
          nodes.push({
            id: `node-${actionNodeId}`,
            type: "custom",
            position: { x: startX + xGap * 2, y: startY - yGap / 2 },
            data: {
              label: "Send Notification",
              icon: "notification",
              description: "Alert: Low balance detected",
            },
          })

          edges.push({
            id: `edge-${nodeId + 1}-${actionNodeId}`,
            source: `node-${nodeId + 1}`,
            target: `node-${actionNodeId}`,
            type: "default",
          })

          actionNodeId++
        }

        if (hasTransaction) {
          nodes.push({
            id: `node-${actionNodeId}`,
            type: "custom",
            position: { x: startX + xGap * 2, y: startY + yGap / 2 },
            data: {
              label: "Execute Transaction",
              icon: "transaction",
              description: "Transfer funds from backup wallet",
            },
          })

          edges.push({
            id: `edge-${nodeId + 1}-${actionNodeId}`,
            source: `node-${nodeId + 1}`,
            target: `node-${actionNodeId}`,
            type: "default",
          })
        }
      } else if (hasNotification) {
        // Direct connection from trigger to notification if no condition
        nodes.push({
          id: `node-${nodeId + 1}`,
          type: "custom",
          position: { x: startX + xGap, y: startY },
          data: {
            label: "Send Notification",
            icon: "notification",
            description: "Wallet balance update",
          },
        })

        edges.push({
          id: `edge-${nodeId}-${nodeId + 1}`,
          source: `node-${nodeId}`,
          target: `node-${nodeId + 1}`,
          type: "default",
        })
      }
    } else if (hasToken) {
      // Token-based workflow
      nodes.push({
        id: `node-${nodeId}`,
        type: "custom",
        position: { x: startX, y: startY },
        data: {
          label: "Token Monitor",
          icon: "token",
          description: "Monitor token price or transfers",
        },
      })

      nodes.push({
        id: `node-${nodeId + 1}`,
        type: "custom",
        position: { x: startX + xGap, y: startY },
        data: {
          label: "Price Analysis",
          icon: "code",
          description: "Analyze price movement",
        },
      })

      edges.push({
        id: `edge-${nodeId}-${nodeId + 1}`,
        source: `node-${nodeId}`,
        target: `node-${nodeId + 1}`,
        type: "default",
      })

      if (hasTransaction) {
        nodes.push({
          id: `node-${nodeId + 2}`,
          type: "custom",
          position: { x: startX + xGap * 2, y: startY },
          data: {
            label: "Swap Tokens",
            icon: "transaction",
            description: "Execute token swap",
          },
        })

        edges.push({
          id: `edge-${nodeId + 1}-${nodeId + 2}`,
          source: `node-${nodeId + 1}`,
          target: `node-${nodeId + 2}`,
          type: "default",
        })
      }
    } else {
      // Default flow for other prompts
      nodes.push({
        id: `node-${nodeId}`,
        type: "custom",
        position: { x: startX, y: startY },
        data: {
          label: "Start Trigger",
          icon: "code",
          description: "Begin automation flow",
        },
      })

      nodes.push({
        id: `node-${nodeId + 1}`,
        type: "custom",
        position: { x: startX + xGap, y: startY },
        data: {
          label: "Process Data",
          icon: "database",
          description: "Process incoming data",
        },
      })

      nodes.push({
        id: `node-${nodeId + 2}`,
        type: "custom",
        position: { x: startX + xGap * 2, y: startY - yGap / 2 },
        data: {
          label: "Success Path",
          icon: "transaction",
          description: "Handle successful outcome",
        },
      })

      nodes.push({
        id: `node-${nodeId + 3}`,
        type: "custom",
        position: { x: startX + xGap * 2, y: startY + yGap / 2 },
        data: {
          label: "Error Path",
          icon: "notification",
          description: "Handle error condition",
        },
      })

      // Connect the nodes
      edges.push({
        id: `edge-${nodeId}-${nodeId + 1}`,
        source: `node-${nodeId}`,
        target: `node-${nodeId + 1}`,
        type: "default",
      })

      edges.push({
        id: `edge-${nodeId + 1}-${nodeId + 2}`,
        source: `node-${nodeId + 1}`,
        target: `node-${nodeId + 2}`,
        type: "default",
      })

      edges.push({
        id: `edge-${nodeId + 1}-${nodeId + 3}`,
        source: `node-${nodeId + 1}`,
        target: `node-${nodeId + 3}`,
        type: "default",
      })
    }

    return { nodes, edges }
  }
}
