# MCP Playground

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) that provides a playground interface for Story MCP.

## Prerequisites

1. Clone the Story MCP Hub repository:
```bash
# Navigate to the parent directory of ai-playground-frontend
cd ..
git clone https://github.com/piplabs/story-mcp-hub.git
```

2. Make sure the backend server is running. See the [ai-playground-backend](../ai-playground-backend) repository for setup instructions.

## Environment Setup

1. Create a `.env` file in the root directory with the following variables:
```bash
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

Start the frontend development server:
```bash
npm run dev
```
The frontend will run on http://localhost:3000

## Development

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses:
- [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) with [Geist](https://vercel.com/font)
- Tailwind CSS for styling
- OpenAI for AI capabilities
- Story MCP Hub for blockchain integration

## Project Structure
```
ai-playground-frontend/
├── app/              # Next.js frontend pages
├── components/       # React components
├── lib/              # Shared utilities
├── public/           # Static assets
└── utils/            # Helper functions
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Troubleshooting

- Ensure the backend server is running on http://localhost:8000
- Verify that all environment variables are properly set
- Make sure the Story MCP Hub repository is in the same parent directory
