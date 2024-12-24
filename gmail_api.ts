import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { gmail_v1 } from 'googleapis';

/**
 * Lists the labels in the user's account.
 *
 * @param auth - An authorized OAuth2 client
 */
async function listLabels(auth: OAuth2Client): Promise<Array<string>> {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.labels.list({
      userId: 'me',
    });
    
    const labels = res.data.labels;
    if (!labels || labels.length === 0) {
      console.log('No labels found.');
      return JSON.parse('{}');
    }
    
    const labelsArray: Array<string> = [];
    labels.forEach((label: gmail_v1.Schema$Label) => {
        labelsArray.push(label.name);
    });
    console.log("here");
    console.log(labelsArray);
    return labelsArray;
  }
  
  export { listLabels };