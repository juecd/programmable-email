import { authorize } from './gmail_auth.js';
import { getMessage } from './gmail_api.js';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Create server instance
const server = new Server(
  {
    name: "gmail-assistant",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get-email-from-message-id",
        description: "Gets email from Gmail with the specified message ID",
        inputSchema: {
          type: "object",
          properties: {
            message_id: {
              type: "string",
              description: "The message ID to retrieve",
            },
          },
          required: ["state"],
        }
      },
    ],
  };
});

// Define Zod schemas for validation
const MessageArgumentsSchema = z.object({
  message_id: z.string()
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const { message_id } = MessageArgumentsSchema.parse(args);

  try {
    if (name === "get-email-from-message-id") {
      
      const auth = await authorize();
      const response = await getMessage(auth, message_id); // 193f9e07c0e65180
      const { bodyDecoded } = response;
      return {
        content: [
          {
            type: "text",
            text: bodyDecoded,
          },
        ],
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gmail assistant running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
