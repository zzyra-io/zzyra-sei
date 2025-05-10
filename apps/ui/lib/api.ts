import type { Node, Edge } from "@/components/flow-canvas";

export async function generateFlow(prompt: string, nodes: Node[], edges: Edge[]) {
  try {
    const response = await fetch("/api/generate-flow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, nodes, edges }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error || data.message || "Failed to generate flow";
      console.error("API error:", errorMessage, data.details || "");
      throw new Error(errorMessage);
    }

    // Validate the response data
    if (!data.nodes || !Array.isArray(data.nodes) || !data.edges || !Array.isArray(data.edges)) {
      console.error("Invalid response data:", data);
      throw new Error("Invalid flow data received from API");
    }

    return data;
  } catch (error) {
    console.error("Error generating flow:", error);
    throw error;
  }
}
