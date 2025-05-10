# Getting Started Guide

This guide provides instructions for setting up the Zyra project for local development.

## Prerequisites

-   **Node.js:** v20.3.0 or higher (especially for `zyra-worker`)
-   **pnpm:** The package manager used in this project (`npm install -g pnpm`)
-   **Supabase Account:** A free or paid account at [supabase.com](https://supabase.com)
-   **Supabase CLI:** Install via instructions at [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)
-   **Docker:** Required *only* if you intend to run Supabase locally using the CLI.
-   **Git:** For cloning the repository.
-   **(Optional) API Keys:** OpenRouter API Key (`NEXT_PUBLIC_OPENROUTER_API_KEY`) for AI features.

## Setup Steps

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd zyra
    ```

2.  **Install Dependencies:**
    Install dependencies for both the UI and the Worker using pnpm:
    ```bash
    # In the project root directory
    pnpm install --recursive
    # Or individually:
    # cd ui
    # pnpm install
    # cd ../zyra-worker
    # pnpm install
    # cd ..
    ```

3.  **Set up Supabase:**
    *   **Login:** Authenticate the Supabase CLI:
        ```bash
        supabase login
        ```
    *   **(If first time)** Initialize Supabase within the `ui` directory (this creates the `ui/supabase` folder if it doesn't exist):
        ```bash
        cd ui
        supabase init
        cd ..
        ```
    *   **Link Project:** Connect your local setup to your Supabase project (Get `YOUR_PROJECT_REF` from your Supabase project dashboard URL: `https://app.supabase.com/project/<YOUR_PROJECT_REF>/...`):
        ```bash
        # Run this inside the ui directory
        cd ui
        supabase link --project-ref YOUR_PROJECT_REF
        # Follow prompts to link the database
        cd ..
        ```
    *   **Environment Variables:**
        *   Copy `.env.example` to `.env` in **both** the `ui/` and `zyra-worker/` directories.
        *   Fill in the required variables in both `.env` files:
            *   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
            *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase project anon key.
            *   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase project service role key (keep this secret!). Found in Project Settings > API.
            *   `DATABASE_URL`: Your Supabase database connection string (usually found in Project Settings > Database). Needed for the worker and migrations.
            *   `NEXT_PUBLIC_OPENROUTER_API_KEY`: Your OpenRouter API key (if using AI features).
            *   Add any other required keys as specified in the `.env.example` files.
    *   **Database Migrations:**
        *   Apply the database schema defined in `ui/supabase/migrations/`.
        *   **Using Supabase Cloud:**
            ```bash
            # Run this inside the ui directory
            cd ui
            supabase migration up
            # Or if you haven't managed migrations formally yet:
            # supabase db push
            cd ..
            ```
        *   **Using Supabase Locally (with Docker):**
            ```bash
            # Run this inside the ui directory
            cd ui
            supabase start # Starts Supabase services in Docker
            supabase db push # Pushes schema from migrations
            cd ..
            # Note: Local Supabase might require additional config for worker connection.
            # Use `supabase stop` to stop the local services.
            ```

4.  **Run the Application:**
    *   **Start the Frontend (UI):**
        ```bash
        cd ui
        pnpm run dev
        ```
        Access the UI at `http://localhost:3000` (or the specified port).
    *   **Start the Backend (Worker):**
        Open a *new terminal window/tab*.
        ```bash
        cd zyra-worker
        pnpm run start:dev # For development with hot-reloading
        # Or for production-like start:
        # pnpm run build
        # pnpm run start
        ```
        The worker will start polling the database for workflow jobs.

## Directory Structure Overview

```
zyra/
├── ui/                     # Next.js Frontend Application
│   ├── app/                # App Router pages and API routes
│   ├── components/         # React components
│   ├── lib/                # Core frontend logic, services, AI providers
│   ├── supabase/           # Supabase configuration and migrations
│   │   └── migrations/     # SQL database migration files
│   ├── public/             # Static assets
│   ├── styles/             # Global styles
│   ├── .env.example        # Environment variable template for UI
│   └── pnpm-lock.yaml
│   └── package.json
│   └── next.config.mjs
│   └── tsconfig.json
│
├── zyra-worker/            # NestJS Backend Worker Service
│   ├── src/                # Worker source code (controllers, services)
│   │   └── main.ts         # Worker entry point
│   ├── test/               # Unit/integration tests
│   ├── .env.example        # Environment variable template for Worker
│   └── pnpm-lock.yaml
│   └── package.json
│   └── tsconfig.json
│
├── docs/                   # Project documentation (This folder might be inside ui/)
├── .gitignore
└── pnpm-workspace.yaml     # Defines the pnpm workspace
```

## Deployment

-   **Frontend (`ui/`):** Designed for deployment on platforms like Netlify or Vercel. Connect your Git repository and configure build settings (Framework: Next.js, Package Manager: pnpm, Build Command: `pnpm build`, Publish Directory: `ui/.next`).
-   **Backend (`zyra-worker/`):** Can be deployed as a standalone Node.js application. Options include:
    -   Containerizing with Docker and deploying to services like AWS Fargate, Google Cloud Run, or Kubernetes.
    -   Deploying to a Virtual Machine (VM) or bare metal server using a process manager like PM2.
    -   Potentially adapting parts to serverless functions (depending on task duration).
    Ensure the deployed worker has access to the necessary environment variables and the Supabase database.
