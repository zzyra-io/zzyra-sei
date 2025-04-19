# Zyra - Web3 Automation SaaS

A modern web application for building Web3 automation workflows with a visual canvas.

## Features

- Supabase authentication with magic links and wallet sign-in
- Visual workflow builder using React Flow
- Natural language command bar for generating workflows
- Pluggable AI provider system (currently using Ollama)
- Dark mode support
- Modern UI with consistent 12px border radius

## Tech Stack

- Next.js
- TypeScript
- TailwindCSS
- Supabase for authentication and storage
- React Flow for the visual workflow canvas
- Styled Components for custom React Flow nodes

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- (Optional) Ollama running locally or accessible API

### Installation

1. Clone the repository
2. Install dependencies:

\`\`\`bash
npm install
\`\`\`

3. Copy the environment variables:

\`\`\`bash
cp .env.example .env.local
\`\`\`

4. Update the environment variables in `.env.local` with your Supabase credentials

### Development

Run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Deployment

The easiest way to deploy the application is using Vercel:

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Add your environment variables
4. Deploy

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/` - React components
- `lib/` - Utility functions and API clients
  - `ai-providers/` - Pluggable AI provider implementations
  - `supabase/` - Supabase client configuration
- `public/` - Static assets

## License

MIT
