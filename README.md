# MCP Dashboard VS Code Extension

GUI to invoke MCP tools from a panel in VS Code, outside of the chat interface.

![Screenshot of MCP Dashboard being used to invoke a MCP tool](/images/screenshot.png)

# Using

This extension can use tools from any MCP server you already have configured in VS Code. Click the extension icon or
use the command ">MCP: Find Tools" to bring up the list of tools you have available. You can then enter any possible
parameters to the tool and click execute. The result will be displayed in your editor.

# Why use it?

MCP often just wraps existing APIs, and VS Code handles authentication for those services. This extension provides a convenient way to access authenticated APIs directly.
By invoking tools outside an AI agent, you can maintain full control over usage and receive unprocessed responses.

## Development

There is a dev container definition you can use.
From outside the dev container you can test the plugin with
`npm run compile && code --extensionDevelopmentPath=. .`

## AI Use

I used AI to generate a lot of this codebase using the [Orchestra agent workflow](https://github.com/ShepAlderson/copilot-orchestra).
That got me 80% of the way there and then I needed to do a lot of refactoring to get it into a better state.
So if you see some code you think is terrible, the AI wrote it. But if you see some code that you think is good, I wrote it :p
But seriously, I've reviewed the output pretty thoroughly and written enough of this project by hand that I have confidence
in its quality.
