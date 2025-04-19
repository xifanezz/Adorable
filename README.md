# Adorable

Open-source version of [Lovable](https://lovable.ai) - an AI agent that can write and edit code through a chat interface.

## Features

- Chat interface for interacting with AI code assistants
- Agent system based on OpenAI codex
- Patch-based code editing with user approval
- Git integration for version control
- Preview capabilities for code changes

## Setup Instructions

### Prerequisites

- Node.js
- PostgreSQL database ([Neon](https://neon.tech) is easy and has a good free tier)
- Anthropic API key
- Freestyle API key

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/freestyle-sh/adorable
   cd adorable
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Get a Freestyle API key

   Head to [our API keys page](https://admin.freestyle.sh/dashboard/api-tokens) to get yours. We're totally free to use right now!

4. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/adorable

   # Anthropic API
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Freestyle API
   FREESTYLE_API_KEY=your_freestyle_api_key
   ```

5. Initialize the database:

   ```bash
   npx drizzle-kit push
   ```

6. Run the development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

For production deployment:

```bash
npm run build
npm run start
```

Or use the included deployment script:

```bash
./deploy.sh
```

