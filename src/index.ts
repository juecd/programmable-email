import { authorize } from './gmail_auth.js';
import { getMessages, getMessage } from './gmail_api.js';
import { buildGmailSearch } from './utils/gmail.js';
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
        name: "get-emails-with-limit",
        description: "Gets emails in the user's inbox up to the specified number.",
        inputSchema: {
          type: "object",
          properties: {
            fetch_num: {
              type: "number",
              description: "The number of emails to fetch. If fewer emails exist, only the available emails are returned.",
            },
            unread: {
              type: "boolean",
              description: "Boolean. Whether to only return unread emails.",
            },
            searchPromotions: {
              type: "boolean",
              description: "Boolean. Whether to search promotional emails instead of the Primary inbox.",
            },
            subjectIncludes: {
              type: "string",
              description: "Search for emails with the specified subject.",
            },
          },
        },
      },
      {
        name: "get-email-with-message-id",
        description: "Gets an email with the specified message ID.",
        inputSchema: {
          type: "object",
          properties: {
            message_id: {
              type: "string",
              description: "The message ID of the email to fetch.",
            },
          },
        },
      }
    ],
  };
});

// Define Zod schemas for validation
const GetMessagesArgumentSchema = z.object({
  fetch_num: z.number().optional(),
  unread: z.boolean().optional(),
  searchPromotions: z.boolean().optional(),
  subjectIncludes: z.string().optional(),
});

const GetMessageArgumentSchema = z.object({
  message_id: z.string(),
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const { fetch_num, unread, searchPromotions, subjectIncludes } = GetMessagesArgumentSchema.parse(args);

  try {
    if (name === "get-emails-with-limit") {
      const maxResults = fetch_num || 10;
      const search = buildGmailSearch({
        properties: {
          status: unread ? ['unread'] : [],
          category: searchPromotions ? 'promotions' : 'primary',
          subject: subjectIncludes || '',
        }
      });

      const auth = await authorize();
      const { messages } = await getMessages(auth, { search, maxResults});

      if (messages) {
        const fetchedMessages = await Promise.all(messages.map(async (message) => {
          if (!message.id) {
            throw new Error(`Message ID is undefined for message: ${JSON.stringify(message)}`);
          }
          const parsedMessage = await getMessage(auth, message.id);
          return parsedMessage;
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(fetchedMessages),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "No messages found",
            },
          ],
        };
      }
    } else if (name === "get-email-with-message-id") {
      const { message_id } = GetMessageArgumentSchema.parse(args);
      const auth = await authorize();
      const parsedMessage = await getMessage(auth, message_id);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(parsedMessage),
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
  console.error("Programmable email running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
