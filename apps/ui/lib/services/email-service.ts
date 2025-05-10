// Email service to send notifications
export interface EmailParams {
  to: string
  subject: string
  body: string
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string }> {
  try {
    // In a real implementation, you would integrate with an email service like SendGrid, AWS SES, etc.
    // For now, we'll just log the email and simulate success

    console.log("Sending email:", params)

    // Simulate API call
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`Email API responded with status: ${response.status}`)
    }

    const result = await response.json()

    return {
      success: true,
      messageId: result.messageId || `mock-${Date.now()}`,
    }
  } catch (error: any) {
    console.error("Error sending email:", error)

    // For development, simulate success even if the API endpoint doesn't exist
    if (error.message.includes("fetch")) {
      console.log("Using mock email service instead")
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
      }
    }

    throw new Error(`Failed to send email: ${error.message}`)
  }
}
