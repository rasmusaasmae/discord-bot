const discord = require("discord.js");
const { prefix, color } = require("../config/config.json");

// Sends message which lists all commands and what they do
exports.run = (client, message, args) => {
  const help = new discord.MessageEmbed()
    .setColor(color)
    .setTitle("Invaliid")
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.avatarURL(),
    })
    .setURL("https://github.com/rasmusaasmae/discord-bot")
    .setDescription(
      `A general purpose bot which currently provides a movie list functionality.\nThe prefix is '${prefix}'.\nThe following commands are implemented:`
    )
    .addField(
      "movie add <query>",
      "Searches for that title, actor etc. in YTS database and returns a selection menu, where a movie can be chosen"
    )
    .addField(
      "movie remove [title]",
      "Removes the movies which include that term in its title. Clears the list if no term is given"
    )
    .addField("movie list", "Lists the movies currently in the queue/rotation")
    .addField(
      "movie clear",
      "Clears all movie related messages sent by this bot"
    )
    .addField("movie randomise", "Randomises the order of the movies")
    .addField("movie torrents", "Lists the movies with their torrents")
    .setFooter({
      text: "Invaliid made by Rasmus#1234",
      iconURL:
        "https://cdn.discordapp.com/avatars/293457943125426176/a_4106a19199c39a18227bbe0123a154dd.webp",
    });
  message.channel.send({ embeds: [help] });
};
