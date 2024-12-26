import { authorize } from './src/gmail_auth';
import { getMessage } from './src/gmail_api';
import { buildGmailSearch, parseGmailMessage } from './src/utils/gmail';
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
    const response = await getMessage(auth, '193f9e07c0e65180')
    .catch((error) => {
      console.error(error);
    });
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