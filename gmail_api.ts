import { OAuth2Client } from 'google-auth-library';
import { gmail_v1 } from 'googleapis';
import { authenticateGmail, createSearchQuery } from './utils/gmail';

async function listLabels(auth: OAuth2Client): Promise<Array<string>> {
    const gmail = authenticateGmail(auth);
    const res = await gmail.users.labels.list({
      userId: 'me',
    });
    
    const labels = res.data.labels;
    if (!labels || labels.length === 0) {
      console.log('No labels found.');
      return [];
    }
    
    const labelsArray: Array<string> = [];
    labels.forEach((label: gmail_v1.Schema$Label) => {
        labelsArray.push(label.name);
    });
    return labelsArray;
  }

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

  async function getMessages(auth: OAuth2Client, { search, labelIds, pageToken, maxResults }: { search?: string, labelIds?: Array<string>, pageToken?: string, maxResults?: number }): Promise<gmail_v1.Schema$Message> {
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
  
  export {
    listLabels,
    getEmailAddress,
    sendMessage,
    getMessages,
    addLabelToMessage
  };