const { Client, Intents } = require("discord.js");
const { token } = require("./auth.json");
const Movie = require("./movie");

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

const movie = new Movie(client);

client.on("ready", (e) => {
  console.log(`Bot ${e.user.username} (${e.user.id}) ready`);
});

const prefix = "!";

client.on("messageCreate", (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return; // ignore if no prefix or a bot

  let args = message.content.split(" ");
  const cmd = args[0].substring(1);
  args = args.splice(1);

  switch (cmd) {
    case "movie":
      movie.action(message.channel, args);
      break;
  }
});

client.on("interactionCreate", (interaction) => {
  if (!interaction.isSelectMenu()) return;

  if (interaction.customId === "movieAddMenu") {
    const res = interaction.values[0].split(":::");
    movie.addMovie(res[0]);
    interaction.update({
      content: `${res[1]} was added to the movie list.`,
      embeds: [],
      components: [],
    });
  }
});

client.login(token);
