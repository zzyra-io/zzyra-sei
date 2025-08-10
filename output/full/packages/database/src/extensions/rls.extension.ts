import { Prisma } from "@prisma/client";

export interface RLSContext {
  userId?: string;
  role?: "admin" | "user" | "readonly";
  organizationId?: string;
}

export function createRLSExtension(context: RLSContext) {
  return Prisma.defineExtension({
    name: "RLS",
    query: {
      // User model - only users can see their own data unless admin
      user: {
        async findMany({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            id: context.userId,
          };
          return query(args);
        },

        async findFirst({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            id: context.userId,
          };
          return query(args);
        },
      },

      // Profile model - same as user
      profile: {
        async findMany({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            id: context.userId,
          };
          return query(args);
        },

        async findFirst({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            id: context.userId,
          };
          return query(args);
        },
      },

      // Wallet model - users can only see their own wallets
      userWallet: {
        async findMany({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            userId: context.userId,
          };
          return query(args);
        },

        async findFirst({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            userId: context.userId,
          };
          return query(args);
        },
      },

      // Workflow Templates - public access for now
      workflowTemplate: {
        async findMany({ args, query }) {
          // Note: WorkflowTemplate doesn't have userId or isPublic fields in current schema
          // Just return all templates for now
          return query(args);
        },

        async findFirst({ args, query }) {
          // Note: WorkflowTemplate doesn't have userId or isPublic fields in current schema
          // Just return all templates for now
          return query(args);
        },

        async findUnique({ args, query }) {
          // Note: No access control fields available in current schema
          return query(args);
        },
      },

      // Workflows - users can only see their own workflows
      workflow: {
        async findMany({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            userId: context.userId,
          };
          return query(args);
        },

        async findFirst({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            userId: context.userId,
          };
          return query(args);
        },
      },

      // Workflow Executions - users can only see their own executions
      workflowExecution: {
        async findMany({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            userId: context.userId,
          };
          return query(args);
        },

        async findFirst({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            userId: context.userId,
          };
          return query(args);
        },
      },

      // Teams - only show teams user is member of
      team: {
        async findMany({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            OR: [
              { createdBy: context.userId },
              { members: { some: { userId: context.userId } } },
            ],
          };
          return query(args);
        },

        async findFirst({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            OR: [
              { createdBy: context.userId },
              { members: { some: { userId: context.userId } } },
            ],
          };
          return query(args);
        },
      },

      // Team Members - users can only see members of teams they belong to
      teamMember: {
        async findMany({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            OR: [
              { userId: context.userId },
              { team: { createdBy: context.userId } },
              { team: { members: { some: { userId: context.userId } } } },
            ],
          };
          return query(args);
        },

        async findFirst({ args, query }) {
          if (context.role === "admin") {
            return query(args);
          }

          args.where = {
            ...args.where,
            OR: [
              { userId: context.userId },
              { team: { createdBy: context.userId } },
              { team: { members: { some: { userId: context.userId } } } },
            ],
          };
          return query(args);
        },
      },
    },
  });
}

/**
 * Organization-level RLS extension
 * Note: Current schema doesn't include organization fields
 * This is a placeholder for future organization support
 */
export const createOrganizationRLSExtension = (context: RLSContext) => {
  // Return null since current schema doesn't support organizations
  return null;
};

/**
 * Admin bypass extension - for system operations that need full access
 */
export const createAdminBypassExtension = () => {
  return Prisma.defineExtension({
    name: "AdminBypass",
    query: {
      // Admin operations bypass RLS - use with caution
    },
  });
};

/**
 * Read-only mode extension - prevents write operations
 */
export const createReadOnlyExtension = () => {
  return Prisma.defineExtension({
    name: "ReadOnly",
    query: {
      $allModels: {
        create() {
          throw new Error("Database is in read-only mode");
        },
        update() {
          throw new Error("Database is in read-only mode");
        },
        delete() {
          throw new Error("Database is in read-only mode");
        },
        upsert() {
          throw new Error("Database is in read-only mode");
        },
      },
    },
  });
};

/**
 * Multi-tenant RLS utilities
 */
export const createRLSUtils = () => {
  return {
    // Validate RLS context
    validateContext: (context: RLSContext) => {
      if (!context.userId && context.role !== "admin") {
        throw new Error("User ID is required for non-admin operations");
      }
    },

    // Create multi-tenant filter
    createTenantFilter: (context: RLSContext, field = "userId") => {
      if (context.role === "admin") {
        return {};
      }
      return { [field]: context.userId };
    },

    // Check if user can access resource
    canAccess: (context: RLSContext, resource: any) => {
      if (context.role === "admin") return true;
      if (!resource) return false;
      return resource.userId === context.userId;
    },
  };
};

/**
 * Create a complete RLS extension manager
 */
export const createRLSExtensionManager = (context: RLSContext) => {
  const extensions = [];

  // Core RLS extension
  extensions.push(createRLSExtension(context));

  // Organization extension (if needed in future)
  const orgExtension = createOrganizationRLSExtension(context);
  if (orgExtension) {
    extensions.push(orgExtension);
  }

  // Add read-only restriction for readonly role
  if (context.role === "readonly") {
    extensions.push(createReadOnlyExtension());
  }

  return extensions;
};
