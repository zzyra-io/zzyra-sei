import { Controller, Post, Body, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BillingService } from "./billing.service";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("checkout")
  @ApiOperation({ summary: "Create checkout session" })
  @ApiResponse({
    status: 200,
    description: "Checkout session created",
  })
  async createCheckout(
    @Request() req: { user?: { id: string } },
    @Body() data: { priceId: string }
  ) {
    const userId = req.user?.id || "user1";
    return this.billingService.createCheckoutSession(userId, data.priceId);
  }

  @Post("webhook")
  @ApiOperation({ summary: "Handle billing webhook" })
  async handleWebhook(@Body() rawBody: Buffer, @Request() req: any) {
    const signature = req.headers["stripe-signature"];
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
