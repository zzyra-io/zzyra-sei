# Environment Variables Guide

This guide lists the essential environment variables required to set up and run the Zyra application locally or in a deployed environment.

## Overview

Environment variables are used to configure the application without hardcoding sensitive information or configuration details directly into the code. Zyra utilizes separate environment variable files for the frontend (`ui/.env`) and the backend worker (`zyra-worker/.env`).

Template files (`ui/.env.example`, `zyra-worker/.env.example`) are provided in the repository. Copy these to `.env` in their respective directories and fill in the values.

**NEVER commit your `.env` files to version control.**

## Required Variables

### `ui/.env` (Frontend - Next.js)

These variables are primarily used by the Next.js frontend application.

-   `NEXT_PUBLIC_SUPABASE_URL`
    -   **Purpose:** The public URL of your Supabase project. Used by the Supabase client library in the browser.
    -   **Source:** Supabase Project Dashboard > Project Settings > API > Project URL.
    -   **Note:** The `NEXT_PUBLIC_` prefix makes this variable accessible in the browser.

-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    -   **Purpose:** The anonymous public key for your Supabase project. Used by the Supabase client library in the browser for operations allowed by Row Level Security (RLS) policies for anonymous or authenticated users.
    -   **Source:** Supabase Project Dashboard > Project Settings > API > Project API Keys > `anon` `public`.
    -   **Note:** The `NEXT_PUBLIC_` prefix makes this variable accessible in the browser.

-   `SUPABASE_SERVICE_ROLE_KEY`
    -   **Purpose:** The secret service role key for your Supabase project. Used by Next.js API routes (server-side) or build processes for operations requiring elevated privileges (bypassing RLS). **Keep this secret!**
    -   **Source:** Supabase Project Dashboard > Project Settings > API > Project API Keys > `service_role` `secret`.
    -   **Security:** Do NOT expose this key to the frontend/browser. It should only be used in server-side environments.

-   `DATABASE_URL`
    -   **Purpose:** The full connection string for your Supabase PostgreSQL database. Primarily used by the Supabase CLI for running migrations (`supabase migration up`) and potentially by server-side processes needing direct database access (though Supabase client is often preferred).
    -   **Source:** Supabase Project Dashboard > Project Settings > Database > Connection string > URI.
    -   **Format:** `postgresql://postgres:[YOUR-PASSWORD]@[AWS-ENDPOINT].supabase.co:5432/postgres`

-   `NEXT_PUBLIC_OPENROUTER_API_KEY` (Optional)
    -   **Purpose:** Your API key for OpenRouter, used for AI-powered workflow and custom block generation features.
    -   **Source:** Your OpenRouter account dashboard.
    -   **Note:** The `NEXT_PUBLIC_` prefix makes this accessible for client-side requests to your own API routes that then use the key server-side (best practice) or potentially directly if needed, though server-side usage is recommended for better security and control.

### `zyra-worker/.env` (Backend - NestJS)

These variables are used by the NestJS worker service.

-   `DATABASE_URL`
    -   **Purpose:** The full connection string for your Supabase PostgreSQL database. Used by the worker (e.g., via Prisma or TypeORM if applicable, or direct pg client) to connect to the database for fetching jobs, logging results, and interacting with data.
    -   **Source:** Supabase Project Dashboard > Project Settings > Database > Connection string > URI.
    -   **Format:** `postgresql://postgres:[YOUR-PASSWORD]@[AWS-ENDPOINT].supabase.co:5432/postgres`
    -   **Note:** This MUST be the same database the `ui` application connects to.

-   `SUPABASE_SERVICE_ROLE_KEY`
    -   **Purpose:** The secret service role key for your Supabase project. Used by the worker for privileged database access (e.g., updating execution statuses, writing logs, accessing data needed for jobs). **Keep this secret!**
    -   **Source:** Supabase Project Dashboard > Project Settings > API > Project API Keys > `service_role` `secret`.

-   **(Optional) Other Worker-Specific Variables:**
    -   The worker might require additional variables for specific integrations (e.g., API keys for third-party services used in blocks, notification service keys). Refer to `zyra-worker/.env.example` for any other specific needs.
    -   `PORT`: Often used to configure the port the NestJS service listens on if it exposes an HTTP interface (though this worker primarily polls the DB). Default is usually 3000 or defined in `main.ts`.

## Security Best Practices

-   Always use the `.env` file mechanism; do not hardcode secrets.
-   Ensure `.env` files are included in your `.gitignore`.
-   Use the `service_role` key only in secure backend environments (API routes, worker).
-   Prefer using the Supabase client library with RLS policies whenever possible, rather than relying solely on the `service_role` key.
-   Rotate keys periodically if possible.
