import { OAuth2Client } from 'google-auth-library';
import { gmail_v1 } from 'googleapis';
import { authenticateGmail, parseGmailMessage, ParsedGmailMessage } from './utils/gmail.js';


  async function getEmailAddress(auth: OAuth2Client): Promise<string> {
    const gmail = authenticateGmail(auth);
    const res = await gmail.users.getProfile({
      userId: 'me',
    });
    return res.data.emailAddress || '';
  }

  async function addLabelToMessage(auth: OAuth2Client, { messageId, labelId }: { messageId: string, labelId: string }): Promise<gmail_v1.Schema$Label> {
    const gmail = authenticateGmail(auth);
    const res = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [labelId]
      }
    });
    /**
     * Returns:
     * {
     *   id: string,
     *   threadId: string,
     *   labelIds: [string],
     * }
     */
    return res.data;
  }

  async function removeLabelFromMessage(auth: OAuth2Client, { messageId, labelId }: { messageId: string, labelId: string }): Promise<gmail_v1.Schema$Label> {
    const gmail = authenticateGmail(auth);
    const res = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: [labelId]
      }
    });
    /**
     * Returns:
     * {
     *   id: string,
     *   threadId: string,
     *   labelIds: [string],
     * }
     */
    return res.data;
  }

  async function sendMessage(auth: OAuth2Client, { subject, body, to }: { subject: string, body: string, to: string }): Promise<gmail_v1.Schema$Message> {
    const gmail = authenticateGmail(auth);
    const fromEmail = await getEmailAddress(auth);
    if (fromEmail?.length === 0 || to?.length === 0 || subject?.length === 0 || body?.length === 0) {
      throw new Error('Missing required fields');
    }

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `From: ${fromEmail}`,
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ];
    const message = messageParts.join('\n');
    // The body needs to be base64url encoded.
    const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
 
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    /**
     * Returns:
     * {
     *   id: string,
     *   threadId: string,
     *   labelIds: [string],
     * }
     */
    return res.data;
  }

  async function getMessages(auth: OAuth2Client, { search, labelIds, pageToken, maxResults }: { search?: string, labelIds?: Array<string>, pageToken?: string, maxResults?: number }): Promise<gmail_v1.Schema$ListMessagesResponse> {
    const gmail = authenticateGmail(auth);
    const res = await gmail.users.messages.list({
      // Hardcoded
      userId: 'me',
      includeSpamTrash: false,
      // Parameters
      q: search || '',
      labelIds: labelIds || [],
      pageToken: pageToken || '',
      maxResults: maxResults || 100,
    });
    /**
     * Returns:
     * {
     *   messages: [{
     *     id: string,
     *     threadId: string,
     *   }],
     *   nextPageToken: string,
     *   resultSizeEstimate: integer,
     * }
     */
    return res.data;
  }

  async function getMessage(auth: OAuth2Client, messageId: string): Promise<ParsedGmailMessage> {
    const gmail = authenticateGmail(auth);
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    /**
     * Returns:
     *   {
            "id": string,
            "threadId": string,
            "labelIds": [
                string
            ],
            "snippet": string,
            "historyId": string,
            "internalDate": string,
            "payload": {
                {
                    "partId": string,
                    "mimeType": string,
                    "filename": string,
                    "headers": [
                        {
                            "name": string,
                            "value": string
                        }
                    ],
                    "body": {
                        {
                            "attachmentId": string,
                            "size": integer,
                            "data": string
                        }
                    },
                    "parts": [
                        {
                        object (MessagePart)
                        }
                    ]
                }
            },
            "sizeEstimate": integer,
            "raw": string
     *   }
     */
    return parseGmailMessage(res.data, 'plain');
  }
  
  export {
    getEmailAddress,
    sendMessage,
    getMessages,
    getMessage,
    addLabelToMessage
  };