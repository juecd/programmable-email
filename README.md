# [WIP] Programmable Email
## An MCP server for connecting Claude with Gmail

This server connects Claude—or any MCP client—with Gmail using Gmail's local oauth tokens.
This server is designed for experimentation and testing purposes. Note that any emails fetched will be sent to Claude's servers.

## Pre-Requisites
- Docker
- Claude Desktop for Mac

## Installation
1. Gmail oauth credentials
You'll first need to generate a personal oauth token following [this guide](https://developers.google.com/workspace/guides/create-credentials). Create Oauth client ID credentials as a server-side application.

You'll need `credentials.json` in your root directory that represents the Google oauth token, as well as `token.json`. `token.json` is automatically generated the first time you use your Google oauth credentials.

2. Run `docker build`
Build the image by running `docker build -t programmable-email .`
Verify that it runs with `docker run -i --rm programmable-email`.

3. Configure Claude with the MCP server
Access the directory where MCP server configs live: `cd ~/Library/Application\ Support/Claude`
Edit `claude_desktop_config.json` with the following:
```
{
	"mcpServers": {
	  "programmable-email": {
		"command": "docker",
		"args": ["run", "-i", "--rm", "programmable-email"]
	  }
	}
}
```

4. Open (or restart) Claude
5. Ask Claude to retrieve your recent unread emails.

### TODO
- Finish Gmail read functionality (currently only a subset of available search capabilities are available, see index.ts)
- Implement Gmail send functionlity as an MCP tool (see `gmail_api.ts` for capabilities)
- More tests
