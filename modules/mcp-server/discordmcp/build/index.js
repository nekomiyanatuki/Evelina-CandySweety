"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const dotenv_1 = __importDefault(require("dotenv"));
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const discord_js_1 = require("discord.js");
const zod_1 = require("zod");
// Load environment variables
dotenv_1.default.config();
// Discord client setup
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
// Helper function to find a guild by name or ID
async function findGuild(guildIdentifier) {
    if (!guildIdentifier) {
        // If no guild specified and bot is only in one guild, use that
        if (client.guilds.cache.size === 1) {
            return client.guilds.cache.first();
        }
        // List available guilds
        const guildList = Array.from(client.guilds.cache.values())
            .map(g => `"${g.name}"`).join(', ');
        throw new Error(`Bot is in multiple servers. Please specify server name or ID. Available servers: ${guildList}`);
    }
    // Try to fetch by ID first
    try {
        const guild = await client.guilds.fetch(guildIdentifier);
        if (guild)
            return guild;
    }
    catch {
        // If ID fetch fails, search by name
        const guilds = client.guilds.cache.filter(g => g.name.toLowerCase() === guildIdentifier.toLowerCase());
        if (guilds.size === 0) {
            const availableGuilds = Array.from(client.guilds.cache.values())
                .map(g => `"${g.name}"`).join(', ');
            throw new Error(`Server "${guildIdentifier}" not found. Available servers: ${availableGuilds}`);
        }
        if (guilds.size > 1) {
            const guildList = guilds.map(g => `${g.name} (ID: ${g.id})`).join(', ');
            throw new Error(`Multiple servers found with name "${guildIdentifier}": ${guildList}. Please specify the server ID.`);
        }
        return guilds.first();
    }
    throw new Error(`Server "${guildIdentifier}" not found`);
}
// Helper function to find a channel by name or ID within a specific guild
async function findChannel(channelIdentifier, guildIdentifier) {
    const guild = await findGuild(guildIdentifier);
    // First try to fetch by ID
    try {
        const channel = await client.channels.fetch(channelIdentifier);
        if (channel instanceof discord_js_1.TextChannel && channel.guild.id === guild.id) {
            return channel;
        }
    }
    catch {
        // If fetching by ID fails, search by name in the specified guild
        const channels = guild.channels.cache.filter((channel) => channel instanceof discord_js_1.TextChannel &&
            (channel.name.toLowerCase() === channelIdentifier.toLowerCase() ||
                channel.name.toLowerCase() === channelIdentifier.toLowerCase().replace('#', '')));
        if (channels.size === 0) {
            const availableChannels = guild.channels.cache
                .filter((c) => c instanceof discord_js_1.TextChannel)
                .map(c => `"#${c.name}"`).join(', ');
            throw new Error(`Channel "${channelIdentifier}" not found in server "${guild.name}". Available channels: ${availableChannels}`);
        }
        if (channels.size > 1) {
            const channelList = channels.map(c => `#${c.name} (${c.id})`).join(', ');
            throw new Error(`Multiple channels found with name "${channelIdentifier}" in server "${guild.name}": ${channelList}. Please specify the channel ID.`);
        }
        return channels.first();
    }
    throw new Error(`Channel "${channelIdentifier}" is not a text channel or not found in server "${guild.name}"`);
}
// Updated validation schemas
const SendMessageSchema = zod_1.z.object({
    server: zod_1.z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
    channel: zod_1.z.string().describe('Channel name (e.g., "general") or ID'),
    message: zod_1.z.string(),
});
const ReadMessagesSchema = zod_1.z.object({
    server: zod_1.z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
    channel: zod_1.z.string().describe('Channel name (e.g., "general") or ID'),
    limit: zod_1.z.number().min(1).max(100).default(50),
});
// Create server instance
const server = new index_js_1.Server({
    name: "discord",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "send-message",
                description: "Send a message to a Discord channel",
                inputSchema: {
                    type: "object",
                    properties: {
                        server: {
                            type: "string",
                            description: 'Server name or ID (optional if bot is only in one server)',
                        },
                        channel: {
                            type: "string",
                            description: 'Channel name (e.g., "general") or ID',
                        },
                        message: {
                            type: "string",
                            description: "Message content to send",
                        },
                    },
                    required: ["channel", "message"],
                },
            },
            {
                name: "read-messages",
                description: "Read recent messages from a Discord channel",
                inputSchema: {
                    type: "object",
                    properties: {
                        server: {
                            type: "string",
                            description: 'Server name or ID (optional if bot is only in one server)',
                        },
                        channel: {
                            type: "string",
                            description: 'Channel name (e.g., "general") or ID',
                        },
                        limit: {
                            type: "number",
                            description: "Number of messages to fetch (max 100)",
                            default: 50,
                        },
                    },
                    required: ["channel"],
                },
            },
        ],
    };
});
// Handle tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "send-message": {
                const { channel: channelIdentifier, message } = SendMessageSchema.parse(args);
                const channel = await findChannel(channelIdentifier);
                const sent = await channel.send(message);
                return {
                    content: [{
                            type: "text",
                            text: `Message sent successfully to #${channel.name} in ${channel.guild.name}. Message ID: ${sent.id}`,
                        }],
                };
            }
            case "read-messages": {
                const { channel: channelIdentifier, limit } = ReadMessagesSchema.parse(args);
                const channel = await findChannel(channelIdentifier);
                const messages = await channel.messages.fetch({ limit });
                const formattedMessages = Array.from(messages.values()).map(msg => ({
                    channel: `#${channel.name}`,
                    server: channel.guild.name,
                    author: msg.author.tag,
                    content: msg.content,
                    timestamp: msg.createdAt.toISOString(),
                }));
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify(formattedMessages, null, 2),
                        }],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid arguments: ${error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ")}`);
        }
        throw error;
    }
});
// Discord client login and error handling
client.once('ready', () => {
    console.error('Discord bot is ready!');
});
// Start the server
async function main() {
    // Check for Discord token
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        throw new Error('Discord: TOKEN environment variable is not set');
    }
    try {
        // Login to Discord
        await client.login(token);
        // Start MCP server
        const transport = new stdio_js_1.StdioServerTransport();
        await server.connect(transport);
        console.error("Discord MCP Server running on stdio");
    }
    catch (error) {
        console.error("Fatal error in main():", error);
        process.exit(1);
    }
}
main();
