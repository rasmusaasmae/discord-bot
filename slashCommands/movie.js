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
      .setName("torrent")
      .setDescription("Get the torrent link for a single movie")
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription("Title of the movie")
          .setRequired(true)
      )
  );

// Load/initialise movie data
let movieData = {
  /*
  guildId_1: {
    movieList: [],
    movieListMsgId: null
  }
  */
};
let searchResults = {};
fs.readFile("./data/movieData.json", "utf-8", (err, data) => {
  if (err) {
    console.log(chalk.red("No data loaded."));
    // console.error(err);
    return;
  }
  try {
    movieData = JSON.parse(data.toString());
  } catch (error) {
    console.log(chalk.red("Data parsing failed."));
    // console.error(error);
    return;
  }
  console.log(chalk.green("Data loaded."));
});

// Save current movie data state to file
function saveState() {
  try {
    const data = JSON.stringify(movieData);
    fs.writeFile("./data/movieData.json", data, (err) => {
      if (err) {
        console.log(chalk.red("Saving failed. Writing to file failed."));
        // console.error(err);
        return;
      }
      // console.log(chalk.green("Data saved."));
    });
  } catch (error) {
    console.log(chalk.red("Saving failed. Parsing failed."));
    // console.error(error);
  }
}

// Check that data exists for guild
function checkGuild(interaction) {
  const { guildId } = interaction;
  if (!movieData[guildId]) movieData[guildId] = {};
  if (!movieData[guildId].movieList) movieData[guildId].movieList = [];
  if (!searchResults[guildId]) searchResults[guildId] = {};
}

// Search for movies in the YTS database
async function searchMovies(interaction, commandType) {
  await interaction.deferReply({
    content: "Searching for movies...",
    ephemeral: true,
  });
  checkGuild(interaction);
  const { guildId } = interaction;

  const query = interaction.options._hoistedOptions[0].value;
  const embed = new discord.MessageEmbed().setColor(color);
  axios
    .get("https://yts.torrentbay.to/api/v2/list_movies.json", {
      params: { query_term: query },
    })
    .then((result) => {
      const movies = result["data"]["data"]["movies"];
      if (movies == undefined) {
        embed.setTitle(`No movies found for term '${query}'.`);
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
        const m = {
          id,
          title_long,
          torrent,
          imdb_code,
          user: interaction.user.username,
        };

        searchResults[guildId][movie.id.toString()] = m;
      }

      embed
        .setTitle(`Results for '${query}':`)
        .addFields(...movieFields)
        .setFooter({
          text: "Data from YTS",
        });

      const selectMenu = new discord.MessageSelectMenu()
        .setPlaceholder("No movie selected")
        .addOptions([selectMenuFields]);

      if (commandType === "add") selectMenu.setCustomId("movieAddMenu");
      else if (commandType === "torrent")
        selectMenu.setCustomId("movieTorrentMenu");

      const messageRow = new discord.MessageActionRow().addComponents(
        selectMenu
      );
      interaction.editReply({ embeds: [embed], components: [messageRow] });
    })
    .catch((error) => {
      console.log(
        chalk.red(
          `Error getting movies or manipulating data. Query '${query}'.`
        )
      );
      // console.error(error);
      embed.setTitle(`Error occurred.`);
      interaction.editReply({ embeds: [embed] });
      return;
    });
  saveState();
}

// Add movie to the list
async function addSelectedMovie(interaction, id) {
  checkGuild(interaction);
  const embed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle("Movie not found.");
  if (id === "NO_MOVIE_CHOSEN")
    return interaction.update({
      embeds: [embed.setTitle(`No movie chosen.`)],
      components: [],
    });
  const movie = searchResults[interaction.guildId][id];
  if (movie) {
    embed.setTitle(`You added ${movie.title_long} to the list.`);
    movieData[interaction.guildId].movieList.push(movie);
    updateMovieListMsg(interaction);
    saveState();
  }
  interaction.update({
    embeds: [embed],
    components: [],
    ephemeral: true,
  });
}

// Remove movie from the list
async function removeMovie(interaction) {
  checkGuild(interaction);
  const query = interaction.options._hoistedOptions[0].value;
  const embed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle(`Select movie to be removed:`);
  const selectMenuFields = [
    {
      label: "CHOOSE NONE",
      value: "NO_MOVIE_CHOSEN",
    },
  ];
  const movies = movieData[interaction.guildId].movieList;
  for (let i = 0; i < movies.length; i++) {
    if (movies[i].title_long.toLowerCase().includes(query)) {
      const { title_long, id } = movies[i];
      if (title_long.length > 100) {
        title_long = title_long.substring(0, 100);
      }
      selectMenuFields.push({
        label: title_long,
        value: id.toString(),
      });
    }
  }

  const selectMenu = new discord.MessageSelectMenu()
    .setPlaceholder("No movie selected")
    .addOptions([selectMenuFields])
    .setCustomId("movieRemoveMenu");

  const messageRow = new discord.MessageActionRow().addComponents(selectMenu);
  interaction.reply({
    embeds: [embed],
    components: [messageRow],
    ephemeral: true,
  });
}

async function removeSelectedMovie(interaction, id) {
  checkGuild(interaction);
  const embed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle(`No movie chosen.`);
  if (id === "NO_MOVIE_CHOSEN")
    return interaction.update({
      embeds: [embed],
      components: [],
    });

  for (let i = 0; i < movieData[interaction.guildId].movieList.length; i++) {
    if (movieData[interaction.guildId].movieList[i].id.toString() === id) {
      embed.setTitle(
        `You removed '${
          movieData[interaction.guildId].movieList[i].title_long
        }' from the list.`
      );
      interaction.update({
        embeds: [embed],
        components: [],
      });
      movieData[interaction.guildId].movieList.splice(i, 1);
      updateMovieListMsg(interaction);
      saveState();
      return;
    }
  }
  embed.setTitle(`Movie was not found.`);
  interaction.update({
    embeds: [embed],
    components: [],
  });
}

// List
async function listMovies(interaction) {
  const embed = getMovieListEmbed(interaction);
  const id = movieData[interaction.guildId].movieListMsgId;
  // Delete old list msg
  if (id) {
    try {
      interaction.channel.messages
        .fetch(id)
        .then((msg) => msg.delete())
        .catch((err) => {
          console.log(
            chalk.red("Didn't find movie list message to be deleted.")
          );
          // console.error(err);
        });
    } catch (error) {
      console.log(chalk.red("Failed to delete old movie list msg."));
      // console.error(error);
    }
  }
  const reply = await interaction.reply({
    content: "Listing movies.",
    fetchReply: true,
  });
  reply.delete();
  const msg = await interaction.channel.send({
    embeds: [embed],
    fetchReply: true,
  });
  movieData[interaction.guildId].movieListMsgId = msg.id;
}

function getMovieListEmbed(interaction) {
  checkGuild(interaction);
  const embed = new discord.MessageEmbed().setColor(color);
  const movies = movieData[interaction.guildId].movieList;

  embed.setTitle(`There are no movies in the list.`);
  if (movies.length !== 0) {
    embed.setTitle(`There are ${movies.length} movies in the list:`);
    if (movies.length === 1) embed.setTitle(`There is 1 movie in the list`);
    const movieFields = [];
    for (let movie of movies) {
      const { torrent, title_long, user } = movie;
      movieFields.push({
        name: `${user}: ${title_long}`,
        value: torrent.url,
      });
    }
    embed.addFields(...movieFields);
  }
  return embed;
}

function updateMovieListMsg(interaction) {
  const id = movieData[interaction.guildId].movieListMsgId;
  if (!id) return;
  const embed = getMovieListEmbed(interaction);

  interaction.channel.messages
    .fetch(id)
    .then((msg) => msg.edit({ embeds: [embed] }))
    .catch((err) => {
      console.log(chalk.red("Couldn't update movie list msg."));
      // console.error(err);
    });
}

// Clear
function clearMovieList(interaction) {
  checkGuild(interaction);
  movieData[interaction.guildId].movieList = [];
  searchResults[interaction.guildId] = {};
  updateMovieListMsg(interaction);
  saveState();
  const embed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle("You cleared the movie list.");
  interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

// Randomise
function randomiseMovieList(interaction) {
  checkGuild(interaction);
  movieData[interaction.guildId].movieList = _.shuffle(
    movieData[interaction.guildId].movieList
  );
  updateMovieListMsg(interaction);
  saveState();
  const embed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle("You randomised the order of the movie list.");
  interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

// Torrent
function getSelectedTorrent(interaction, id) {
  checkGuild(interaction);
  const embed = new discord.MessageEmbed().setColor(color);
  if (id === "NO_MOVIE_CHOSEN") {
    embed.setTitle(`No movie chosen.`);
  } else {
    const movie = searchResults[interaction.guildId][id];
    if (!movie) {
      embed.setTitle("Movie not found.");
    } else {
      embed.addField(movie.title_long, movie.torrent.url);
    }
  }
  interaction.update({
    embeds: [embed],
    components: [],
    ephemeral: true,
  });
}

// Export commands
module.exports = {
  data: command,
  async execute(interaction) {
    return interaction.reply("Not implemented");
  },
  async addMovie(interaction) {
    searchMovies(interaction, "add");
  },
  async torrent(interaction) {
    searchMovies(interaction, "torrent");
  },
  listMovies,
  getSelectedTorrent,
  addSelectedMovie,
  removeMovie,
  removeSelectedMovie,
  clearMovieList,
  randomiseMovieList,
};
