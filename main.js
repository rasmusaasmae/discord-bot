// Discord
const discord = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
// Filesystem
const fs = require("fs");
// Datastructure for commands
const Enmap = require("enmap");
// Colorful console logging
const chalk = require("chalk");
// Config
const config = require("./config/config.json");

// https://discord.com/api/oauth2/authorize?client_id=972280856213323827&permissions=10774375504&scope=bot%20applications.commands

// Discord client
const client = new discord.Client({
  intents: [discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MESSAGES],
});
client.config = config;

// Read and bind events (message received, slash command used and option chosen from menu)
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
    console.log(chalk.green(`${config.prefix}${commandName}`));
    client.commands.set(commandName, props);
  });
});

// Register slash (/) commands
const commands = [];
const commandFiles = fs
  .readdirSync("./slashCommands/")
  .filter((file) => file.endsWith(".js"));
const clientId = config.clientId;
const guildId = config.guildId;
for (const file of commandFiles) {
  console.log(chalk.yellow(`/${file.split(".")[0]}`));
  const command = require(`./slashCommands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "9" }).setToken(config.token);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

// Login client
client.login(config.token);
