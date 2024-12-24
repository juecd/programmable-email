import { authorize } from './gmail_auth';
import { getMessage } from './gmail_api';
import { buildGmailSearch, parseGmailMessage } from './utils/gmail';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { mock } from 'node:test';

const app: Express = express();
const port: number = 3000;

// Create HTTP server instance
const server = createServer(app);

// Create WebSocket server instance
const wss = new WebSocketServer({ server });

app.use(express.static('public'));

// Regular HTTP endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');

  // Send welcome message to client
  ws.send('Welcome to the WebSocket server!');

  // Handle incoming messages
  ws.on('message', async (data: Buffer) => {
    console.log('Received:', data.toString());
    const auth = await authorize();
    // const response = await getMessage(auth, '193f9e07c0e65180')
    // .catch((error) => {
    //   console.error(error);
    // });
    console.log("boop")
    const mockMessage = {
      id: '12345',
      threadId: '67890',
      payload: {
        headers: [
          { name: 'From', value: 'John Doe <john@example.com>' },
          { name: 'Subject', value: 'Test Subject' }
        ],
        parts: [
          {
            mimeType: 'text/plain',
            body: {
              size: 100,
              data: 'invalid-base64-data'
            }
          }
        ]
      }
    };
    console.log(mockMessage);
    const response = parseGmailMessage(mockMessage, 'plain');
    if (response) {
      ws.send(JSON.stringify(response));
    } else {
      ws.send('Failed to send message');
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Handle errors
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});