const discord = require("discord.js");
const Enmap = require("enmap");
const fs = require("fs");
const chalk = require("chalk");
const config = require("./config/config.json");

// Discord client
const client = new discord.Client({
  intents: [discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MESSAGES],
});
client.config = config;

// Read and bind events (message received and option chosen from menu)
fs.readdir("./events/", (err, files) => {
  if (err) return console.error(err);
  files.forEach((file) => {
    const event = require(`./events/${file}`);
    let eventName = file.split(".")[0];
    client.on(eventName, event.bind(null, client));
  });
});

// Setting up commands
client.commands = new Enmap();
fs.readdir("./commands/", (err, files) => {
  if (err) return console.error(err);
  files.forEach((file) => {
    if (!file.endsWith(".js")) return;
    let props = require(`./commands/${file}`);
    let commandName = file.split(".")[0];
    console.log(chalk.green(`[+] ${commandName}`));
    client.commands.set(commandName, props);
  });
});

// Set activity when bot is ready
client.on("ready", () => {
  client.user.setActivity(`${config.prefix}help`, {
    type: "WATCHING",
  });
});

// Login client
client.login(config.token);
