import { createServiceClient } from './serviceClient';

/**
 * Create a Supabase client for server-side operations
 */
export const createClient = (): ReturnType<typeof createServiceClient> => {
  return createServiceClient();
};
