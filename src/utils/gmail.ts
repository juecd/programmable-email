import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

function authenticateGmail(auth: OAuth2Client): gmail_v1.Gmail {
  return google.gmail({ version: 'v1', auth });
}

// ===== Create a Gmail search query =====
type DateString = string; // YYYY/MM/DD format
type EmailAddress = string;
type TimeUnit = 'd' | 'm' | 'y';
type Category = 'primary' | 'social' | 'promotions' | 'updates';
type MessageStatus = 'important' | 'starred' | 'unread' | 'read';

interface TimeRange {
    after?: DateString;
    before?: DateString;
    olderThan?: `${number}${TimeUnit}`;
    newerThan?: `${number}${TimeUnit}`;
}

interface Participants {
    from?: EmailAddress | EmailAddress[];
    to?: EmailAddress | EmailAddress[];
    cc?: EmailAddress | EmailAddress[];
    bcc?: EmailAddress | EmailAddress[];
}

interface MessageProperties {
    subject?: string;
    hasExactPhrase?: string;
    label?: string[];
    category?: Category;
    status?: MessageStatus[];
    hasLabels?: boolean;
    isMuted?: boolean;
    isSnoozed?: boolean;
    excludeTerms?: string[];
}

interface ProximitySearch {
    term1: string;
    term2: string;
    distance: number;
    maintainOrder?: boolean;
}

interface GmailSearchParams {
    participants?: Participants;
    timeRange?: TimeRange;
    properties?: MessageProperties;
    proximitySearches?: ProximitySearch[];
    or?: GmailSearchParams[];
}

function validateSearchParams(params: GmailSearchParams): void {
    if (!params || typeof params !== 'object') {
      throw new Error('Search parameters must be an object');
    }
  
    if (params.timeRange) {
      const { after, before } = params.timeRange;
      const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
      
      if (after && !dateRegex.test(after)) {
        throw new Error('After date must be in YYYY/MM/DD format');
      }
      if (before && !dateRegex.test(before)) {
        throw new Error('Before date must be in YYYY/MM/DD format');
      }
      
      if (params.timeRange.olderThan && !/^\d+[dmy]$/.test(params.timeRange.olderThan)) {
        throw new Error('olderThan must be in format number+unit (d/m/y)');
      }
      if (params.timeRange.newerThan && !/^\d+[dmy]$/.test(params.timeRange.newerThan)) {
        throw new Error('newerThan must be in format number+unit (d/m/y)');
      }
    }
  
    if (params.properties?.category && 
        !['primary', 'social', 'promotions', 'updates', 'forums', 'reservations', 'purchases'].includes(params.properties.category)) {
      throw new Error('Invalid category value');
    }
  
    if (params.properties?.status) {
      const validStatus = ['important', 'starred', 'unread', 'read'];
      params.properties.status.forEach(status => {
        if (!validStatus.includes(status)) {
          throw new Error(`Invalid status: ${status}`);
        }
      });
    }
  
    if (params.proximitySearches) {
      params.proximitySearches.forEach(search => {
        if (typeof search.distance !== 'number' || search.distance < 1) {
          throw new Error('Proximity search distance must be a positive number');
        }
      });
    }
  
    if (params.or) {
      params.or.forEach(orParam => validateSearchParams(orParam));
    }
  }

/* Example usage:
  const query = buildGmailSearch({
    participants: {
      from: 'john@example.com',
      to: ['alice@example.com', 'bob@example.com']
    },
    timeRange: {
      after: '2024/01/01',
      olderThan: '30d'
    },
    properties: {
      subject: 'meeting',
      status: ['unread'],
      excludeTerms: ['cancelled']
    },
    proximitySearches: [{
      term1: 'project',
      term2: 'deadline',
      distance: 5,
      maintainOrder: true
    }]
  });
*/
function buildGmailSearch(params: GmailSearchParams): string {
    validateSearchParams(params);
    const terms: string[] = [];

    if (params.participants) {
        const { from, to, cc, bcc } = params.participants;
        
        if (from) {
        const addresses = Array.isArray(from) ? from : [from];
        terms.push(...addresses.map(email => `from:${email}`));
        }
        if (to) {
        const addresses = Array.isArray(to) ? to : [to];
        terms.push(...addresses.map(email => `to:${email}`));
        }
        if (cc) {
        const addresses = Array.isArray(cc) ? cc : [cc];
        terms.push(...addresses.map(email => `cc:${email}`));
        }
        if (bcc) {
        const addresses = Array.isArray(bcc) ? bcc : [bcc];
        terms.push(...addresses.map(email => `bcc:${email}`));
        }
    }

    if (params.timeRange) {
        const { after, before, olderThan, newerThan } = params.timeRange;
        if (after) terms.push(`after:${after}`);
        if (before) terms.push(`before:${before}`);
        if (olderThan) terms.push(`older_than:${olderThan}`);
        if (newerThan) terms.push(`newer_than:${newerThan}`);
    }

    if (params.properties) {
        const { subject, hasExactPhrase, label, category, status, hasLabels, isMuted, isSnoozed, excludeTerms } = params.properties;
        
        if (subject) terms.push(`subject:${subject}`);
        if (hasExactPhrase) terms.push(`"${hasExactPhrase}"`);
        if (label) terms.push(...label.map(l => `label:${l}`));
        if (category) terms.push(`category:${category}`);
        if (status) terms.push(...status.map(s => `is:${s}`));
        if (hasLabels !== undefined) terms.push(hasLabels ? 'has:userlabels' : 'has:nouserlabels');
        if (isMuted) terms.push('is:muted');
        if (isSnoozed) terms.push('in:snoozed');
        if (excludeTerms) terms.push(...excludeTerms.map(term => `-${term}`));
    }

    if (params.proximitySearches) {
        terms.push(...params.proximitySearches.map(({ term1, term2, distance, maintainOrder }) => 
        maintainOrder 
            ? `"${term1} AROUND ${distance} ${term2}"`
            : `${term1} AROUND ${distance} ${term2}`
        ));
    }

    if (params.or && params.or.length > 0) {
        const orTerms = params.or.map(orParam => buildGmailSearch(orParam));
        return `{${orTerms.join(' ')}}`;
    }

    return terms.join(' ');
}

// ===== Parse a Gmail message =====
// bodyType: 'plain' | 'html'
interface GmailMessagePart {
  mimeType?: string | null;
  headers?: Array<{
    name: string;
    value: string;
  }>;
  body?: {
    size: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

type Schema$MessagePart = gmail_v1.Schema$MessagePart;
type Schema$Message = gmail_v1.Schema$Message;

interface ParsedGmailMessage {
  id: string;
  threadId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyDecoded: string;
}

function parseGmailMessage(message: Schema$Message, bodyType: 'plain' | 'html'): ParsedGmailMessage {
  // Initialize empty result
  const result: ParsedGmailMessage = {
    id: message.id || '',
    threadId: message.threadId || '',
    fromName: '',
    fromEmail: '',
    subject: '',
    bodyDecoded: ''
  };

  // Get headers from the payload
  const headers = message.payload?.headers || [];

  // Parse from and subject from headers
  for (const header of headers) {
    if (header.name === 'From' && header.value) {
      const fromMatch = header.value.match(/^([^<]+)?<([^>]+)>$/);
      if (fromMatch) {
        result.fromName = (fromMatch[1] || '').trim();
        result.fromEmail = fromMatch[2].trim();
      }
    } else if (header.name === 'Subject' && header.value) {
      result.subject = header.value;
    }
  }

  // Function to find the correct body part
  // Function to find the correct body part
function findBodyPart(part: Schema$MessagePart): string | undefined {
  // First check direct parts array
  if (part.parts) {
    for (const subPart of part.parts) {
      if (subPart.mimeType === `text/${bodyType}` && subPart.body?.data) {
        return subPart.body.data;
      }
    }
    
    // If not found in direct parts, recursively check nested parts
    for (const subPart of part.parts) {
      const found = findBodyPart(subPart);
      if (found) return found;
    }
  }
  
  // Finally check the part itself
  if (part.mimeType === `text/${bodyType}` && part.body?.data) {
    return part.body.data;
  }

  return undefined;
}

// Find and decode the body
if (message.payload) {
  const bodyData = findBodyPart(message.payload);
  if (bodyData) {
    try {
      // Replace URL-safe characters and padding
      const normalized = bodyData
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .replace(/\s/g, '');
      result.bodyDecoded = Buffer.from(normalized, 'base64').toString('utf8');
    } catch (error) {
      console.error('Error decoding message body:', error);
      result.bodyDecoded = '';
    }
  }
}

  return result;
}
  
export {
    authenticateGmail,
    buildGmailSearch,
    validateSearchParams,
    GmailSearchParams,
    ParsedGmailMessage,
    parseGmailMessage
};