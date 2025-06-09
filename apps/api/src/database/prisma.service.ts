import { Injectable, OnModuleInit } from "@nestjs/common";
import { prisma } from "@zyra/database";

@Injectable()
export class PrismaService implements OnModuleInit {
  public client = prisma;

  async onModuleInit() {
    // Connect to the database when the module initializes
    await this.client.$connect();
  }

  async onModuleDestroy() {
    // Disconnect from the database when the module is destroyed
    await this.client.$disconnect();
  }
}
