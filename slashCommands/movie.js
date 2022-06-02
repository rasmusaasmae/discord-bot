BigInt.prototype.toJSON = function () {
  return this.toString();
};
// Discord
const discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
// Filesystem
const fs = require("fs");
// HTTP get
const axios = require("axios");
// Colorful console logging
const chalk = require("chalk");
// Array order randomisation
const _ = require("underscore");
// Bot color
const { color } = require("../config/config.json");

// Slash command info
const command = new SlashCommandBuilder()
  .setName("movie")
  .setDescription("Manage a movie list")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Add a movie to the list")
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription("Title of the movie")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Remove a movie from the list")
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription("Title of the movie (can be partial)")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("list").setDescription("List the movies")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("clear").setDescription("Clear the movie list")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("randomise")
      .setDescription("Randomise the order of the movies")
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName("torrents")
      .setDescription("List the movies with their torrents")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("torrent")
      .setDescription("Get the torrent link for a single movie")
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription("Title of the movie")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("clearmessages")
      .setDescription("Clear the messages sent by the bot")
  );

// Load/initialise movie data
let movieData = {};
fs.readFile("./data/movieData.json", "utf-8", (err, data) => {
  if (err) return console.log(err);
  movieData = JSON.parse(data.toString());
  console.log("LOADED:");
  console.log(movieData);
});

// Save current movie data state to file
function saveState() {
  console.log("SAVING:");
  console.log(movieData);
  const data = JSON.stringify(movieData);

  fs.writeFile("./data/movieData.json", data, (err) => {
    if (err) return console.log(err);
    console.log("JSON data is saved.");
  });
}

// Save the interaction so that it can be removed later
function saveInteraction(interaction) {
  checkGuild(interaction);
  const { guildId, channelId } = interaction;
  movieData[guildId].interactions[channelId].push(interaction);
}

// Check that data exists for guild
function checkGuild(interaction) {
  const { guildId, channelId } = interaction;
  if (!movieData[guildId]) movieData[guildId] = {};
  if (!movieData[guildId].movieList) movieData[guildId].movieList = [];
  if (!movieData[guildId].searchResults) movieData[guildId].searchResults = {};
  if (!movieData[guildId].interactions) movieData[guildId].interactions = {};
  if (!movieData[guildId].interactions[channelId])
    movieData[guildId].interactions[channelId] = [];
}

// Search for movies in the YTS database
async function searchMovies(interaction, reply) {
  await interaction.deferReply({
    content: "Searching for movies...",
    ephemeral: true,
  });
  checkGuild(interaction);
  const { guildId } = interaction;
  saveInteraction(interaction);

  const query = interaction.options._hoistedOptions[0].value;
  const embed = new discord.MessageEmbed().setColor(color);
  axios
    .get("https://yts.torrentbay.to/api/v2/list_movies.json", {
      params: { query_term: query },
    })
    .then((result) => {
      const movies = result["data"]["data"]["movies"];
      if (movies == undefined) {
        embed.setTitle(`No movies found for term '${query}'`);
        interaction.editReply({ embeds: [embed] });
        return;
      }
      const movieFields = [];
      const selectMenuFields = [
        {
          label: "CHOOSE NONE",
          value: "NO_MOVIE_CHOSEN",
        },
      ];

      for (let movie of movies) {
        const { id, imdb_code, torrents } = movie;
        let { title_long } = movie;
        const imdb = `https://www.imdb.com/title/${imdb_code}/`;

        movieFields.push({
          name: title_long,
          value: imdb,
        });

        if (title_long.length > 100) {
          title_long = title_long.substring(0, 100);
        }

        selectMenuFields.push({
          label: title_long,
          value: id.toString(),
        });

        // Choosing the best (1080 bluray) torrent
        const quality = { "1080p": 20, "720p": 10 };
        const type = { bluray: 2, web: 1 };
        let torrent;
        let torrent_score = 0;
        for (t of torrents) {
          const t_score = quality[t.quality] + type[t.type];
          if (t_score > torrent_score) {
            torrent = t;
            torrent_score = t_score;
          }
        }
        // Creating movie object
        const m = { id, title_long, torrent, imdb_code };

        movieData[guildId].searchResults[movie.id.toString()] = m;
      }

      embed
        .setTitle(`Results for '${query}':`)
        .addFields(...movieFields)
        .setTimestamp()
        .setFooter({
          text: "Data from YTS",
        });

      const selectMenu = new discord.MessageSelectMenu()
        .setPlaceholder("No movie selected")
        .addOptions([selectMenuFields]);

      if (reply === "add") selectMenu.setCustomId("movieAddMenu");
      else if (reply === "torrent") selectMenu.setCustomId("movieTorrentMenu");

      const messageRow = new discord.MessageActionRow().addComponents(
        selectMenu
      );
      interaction.editReply({ embeds: [embed], components: [messageRow] });
    })
    .catch((error) => {
      console.log(chalk.red(`Error in searchMovies(message, ${query})`));
      console.error(error);
      embed.setTitle(`Error occurred for query '${query}'`);
      interaction.editReply({ embeds: [embed] });
      return;
    });
  saveState();
}

// Add movie to the list
async function addMovie(interaction, id) {
  checkGuild(interaction);
  const movie = movieData[interaction.guildId].searchResults[id];
  if (!movie) {
    interaction.update({
      content: "Error finding movie",
      embeds: [],
      components: [],
      ephemeral: false,
    });
  } else {
    movieData[interaction.guildId].movieList.push(movie);
    interaction.update({
      content: `${movie.title_long} was added to the list.`,
      embeds: [],
      components: [],
      ephemeral: false,
    });
  }
  saveState();
}

// Remove movie(s) from the list

// List

// Clear

// Randomise

// Torrents

// Torrent
function getTorrent(interaction, id) {
  checkGuild(interaction);
  const movie = movieData[interaction.guildId].searchResults[id];
  if (!movie) {
    interaction.editReply({ content: "Error finding movie", ephemeral: false });
  } else {
    interaction.editReply({
      content: `${movie.title_long}\n${movie.torrent}`,
      ephemeral: false,
    });
  }
}

// Delete messages sent by the bot
function clearMessages(interaction) {
  interaction.deferReply({
    content: "Clearing messages...",
    ephemeral: true,
  });
  checkGuild(interaction);
  saveInteraction(interaction);
  const { guildId, channelId } = interaction;
  for (let i of movieData[guildId].interactions[channelId]) {
    try {
      i.deleteReply();
    } catch (error) {
      console.log("Nope");
    }
  }
  delete movieData[guildId].interactions[channelId];
  interaction.editReply({
    content: "Messages cleared",
    ephemeral: false,
  });
  saveState();
}

// Export commands
module.exports = {
  data: command,
  async execute(interaction) {
    return interaction.reply("Not implemented");
  },
  async add(interaction) {
    searchMovies(interaction, "add");
  },
  async list(interaction) {
    return interaction.reply(`List`);
  },
  async torrent(interaction) {
    searchMovies(interaction, "torrent");
  },
  async clearMessages(interaction) {
    clearMessages(interaction);
  },
  async getTorrent(interaction, id) {
    getTorrent(interaction, id);
  },
  addMovie(interaction, id) {
    addMovie(interaction, id);
  },
};
