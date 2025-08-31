# AI Playground Frontend

This is a sophisticated [Next.js](https://nextjs.org) chat interface that seamlessly integrates with the **specialized multi-agent system** backend, featuring intelligent transaction confirmations, MCP server selection, and enhanced user experience for Story Protocol operations.

## 🎨 Key Features

### **Enhanced Chat Interface**
- **Persistent Conversations**: Backend-managed chat history with conversation continuity
- **Simplified Architecture**: Frontend only sends latest user message, backend handles full history
- **WebGL Background**: Dynamic, animated shader background that responds to mouse movement

### **Smart Transaction Confirmation System**
- **Interactive Confirmation Modals**: Beautiful, informative popups for transaction approvals
- **User-Friendly Parameter Display**: Technical blockchain parameters presented in readable format
- **Real-time Transaction Details**: Clear display of operation type, fees, network impact, and parameters
- **Sensitive Action Protection**: Confirmation required for every sensitive blockchain operation
- **Duplicate Prevention**: Intelligent tracking to prevent duplicate confirmation popups

### **MCP Server Selection Interface**
- **Dynamic Server Switching**: Users can choose between different MCP server types
- **Visual Status Indicators**: Real-time availability and connection status
- **Wallet Requirements**: Smart detection of wallet-required servers
- **Coming Soon Support**: UI for future server implementations
- **Smooth Animations**: Polished Framer Motion transitions

### **Advanced User Experience**
- **Wallet Integration**: Full wagmi integration for Web3 wallet connection and signing
- **Error Boundaries**: Comprehensive error handling and recovery


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
├── app/
│   ├── api/
│   │   └── interrupt/
│   │       └── confirm/
│   │           └── route.ts      # Interrupt confirmation API endpoint
│   ├── page.tsx                  # Main chat interface with confirmation system
│   └── layout.tsx                # App layout with Web3 providers
├── components/
│   ├── mcp-server-selector.tsx   # MCP server selection interface
│   ├── chat-ui.tsx              # Core chat components
│   ├── transaction-table.tsx     # Transaction history display
│   ├── stats-panel.tsx          # Analytics and stats
│   └── background-canvas.tsx     # WebGL shader background
├── lib/
│   └── context/
│       └── StoryContext.tsx     # Story Protocol context provider
├── utils/
│   ├── conversation.ts          # Conversation state management
│   └── api.ts                   # API utilities
└── public/                      # Static assets
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
