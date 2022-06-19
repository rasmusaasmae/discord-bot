BigInt.prototype.toJSON = function () {
  return this.toString();
};
// Discord
const discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
// HTTP get
const axios = require("axios");
// Colorful console logging
const chalk = require("chalk");
// Array order randomisation
const _ = require("underscore");
// Bot color
const { color } = require("../config/config.json");

const ddbUpdateItem = require("../ddbCommands/ddbUpdateItem");
const ddbGetItem = require("../ddbCommands/ddbGetItem");

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

let searchResults = {};

async function getMovieData(guildId) {
  const movieData = await ddbGetItem(guildId);
  if (movieData) return movieData;
  searchResults[guildId] = {};
  console.log(`${guildId} was not in database.`);
  return {
    movieList: [],
  };
}

// Save current movie data state to file
async function setMovieData(guildId, item) {
  await ddbUpdateItem(guildId, item);
}

// Search for movies in the YTS database
async function searchMovies(interaction, commandType) {
  await interaction.deferReply({
    content: "Searching for movies...",
    ephemeral: true,
  });
  const { guildId } = interaction;

  const query = interaction.options._hoistedOptions[0].value;
  const embed = new discord.MessageEmbed().setColor(color);
  axios
    .get("https://yts.torrentbay.to/api/v2/list_movies.json", {
      params: { query_term: query },
      withCredentials: true,
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
      if (!searchResults[guildId]) searchResults[guildId] = {};
      for (let movie of movies) {
        const { torrents } = movie;
        const id = movie.id.toString();
        const title_long = movie.title_long.substring(0, 100);
        const imdb = `https://www.imdb.com/title/${movie.imdb_code}/`;

        movieFields.push({
          name: title_long,
          value: imdb,
        });

        selectMenuFields.push({
          label: title_long,
          value: id,
        });

        // Choosing the best (1080 bluray) torrent
        const quality = { "1080p": 20, "720p": 10 };
        const type = { bluray: 2, web: 1 };
        let torrent;
        let torrent_score = 0;
        for (t of torrents) {
          const t_score = quality[t.quality] + type[t.type];
          if (t_score > torrent_score) {
            const { url, quality, type, size } = t;
            torrent = { url, quality, type, size };
            torrent_score = t_score;
          }
        }
        searchResults[guildId][id] = {
          id,
          title_long,
          torrent,
          imdb,
          user: interaction.user.username,
        };
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
      console.error(error);
      embed.setTitle(`Error occurred.`);
      interaction.editReply({ embeds: [embed] });
      return;
    });
}

// Add movie to the list
async function addSelectedMovie(interaction, id) {
  const embed = new discord.MessageEmbed().setColor(color);
  if (id === "NO_MOVIE_CHOSEN") {
    embed.setTitle(`No movie chosen.`);
  } else {
    const movie = searchResults[interaction.guildId][id];
    if (!movie) {
      embed.setTitle("Movie not found.");
    } else {
      let movieInList = false;
      const movieData = await getMovieData(interaction.guildId);
      for (let m of movieData.movieList) {
        if (movie.id === m.id) movieInList = true;
      }
      if (movieInList) {
        embed.setTitle(`${movie.title_long} is already in the list.`);
      } else {
        embed.setTitle(`You added ${movie.title_long} to the list.`);
        movieData.movieList.push(movie);
        await setMovieData(interaction.guildId, movieData);
        updateMovieListMsg(interaction, "add");
      }
    }
  }
  interaction.update({
    embeds: [embed],
    components: [],
    ephemeral: true,
  });
}

// Remove movie from the list
async function removeMovie(interaction) {
  await interaction.deferReply({
    content: "Searching for matching movies...",
    ephemeral: true,
  });
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
  const movieData = await getMovieData(interaction.guildId);
  const movies = movieData.movieList;
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
  interaction.editReply({
    embeds: [embed],
    components: [messageRow],
    ephemeral: true,
  });
}

async function removeSelectedMovie(interaction, id) {
  const embed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle(`No movie chosen.`);
  if (id === "NO_MOVIE_CHOSEN")
    return interaction.update({
      embeds: [embed],
      components: [],
    });

  const movieData = await getMovieData(interaction.guildId);
  for (let i = 0; i < movieData.movieList.length; i++) {
    if (movieData.movieList[i].id.toString() === id) {
      embed.setTitle(
        `You removed '${movieData.movieList[i].title_long}' from the list.`
      );
      interaction.update({
        embeds: [embed],
        components: [],
      });
      movieData.movieList.splice(i, 1);
      await setMovieData(interaction.guildId, movieData);
      updateMovieListMsg(interaction, "remove");
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
  const reply = await interaction.reply({
    content: "Listing movies...",
    fetchReply: true,
  });
  const embed = await getMovieListEmbed(interaction);
  const movieData = await getMovieData(interaction.guildId);
  const id = movieData.movieListMsgId;
  // Delete old list msg
  if (id) {
    try {
      await interaction.channel.messages
        .fetch(id)
        .then((msg) => msg.delete())
        .catch((err) => {
          console.log(
            chalk.red("Didn't find movie list message to be deleted.")
          );
        });
    } catch (error) {
      console.log(chalk.red("Failed to delete old movie list msg."));
      // console.error(error);
    }
  }

  reply.delete();
  const msg = await interaction.channel.send({
    embeds: [embed],
    fetchReply: true,
  });
  movieData.movieListMsgId = msg.id;
  setMovieData(interaction.guildId, movieData);
}

async function getMovieListEmbed(interaction) {
  const embed = new discord.MessageEmbed().setColor(color);
  const movieData = await getMovieData(interaction.guildId);
  const movies = movieData.movieList;

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

async function updateMovieListMsg(interaction, action) {
  const movieData = await getMovieData(interaction.guildId);
  const id = movieData.movieListMsgId;
  if (!id) return;
  const embed = await getMovieListEmbed(interaction);
  const { username, avatar } = interaction.user;
  const iconURL = `https://cdn.discordapp.com/avatars/${interaction.user.id}/${avatar}.jpeg`;
  switch (action) {
    case "randomise":
      embed
        .setFooter({
          text: `Randomised by ${username}`,
          iconURL,
        })
        .setTimestamp();
      break;
    case "add":
      embed
        .setFooter({
          text: `Movie added by ${username}`,
          iconURL,
        })
        .setTimestamp();
      break;
    case "remove":
      embed
        .setFooter({
          text: `Movie removed by ${username}`,
          iconURL,
        })
        .setTimestamp();
      break;
    case "clear":
      embed
        .setFooter({
          text: `Movie list cleared by ${username}`,
          iconURL,
        })
        .setTimestamp();
      break;
    default:
      break;
  }

  interaction.channel.messages
    .fetch(id)
    .then((msg) => msg.edit({ embeds: [embed] }))
    .catch((err) => {
      console.log(chalk.red("Couldn't update movie list msg."));
      console.error(err);
    });
}

// Clear
async function clearMovieList(interaction) {
  await interaction.deferReply({
    content: "Clearing movie list...",
    ephemeral: true,
  });
  const movieData = await getMovieData(interaction.guildId);
  movieData.movieList = [];
  searchResults[interaction.guildId] = {};
  await setMovieData(interaction.guildId, movieData);
  updateMovieListMsg(interaction, "clear");
  const embed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle("You cleared the movie list.");
  interaction.editReply({
    embeds: [embed],
    ephemeral: true,
  });
}

// Randomise
async function randomiseMovieList(interaction) {
  await interaction.deferReply({
    content: "Randomising...",
    ephemeral: true,
  });
  const movieData = await getMovieData(interaction.guildId);
  movieData.movieList = _.shuffle(movieData.movieList);
  await setMovieData(interaction.guildId, movieData);
  updateMovieListMsg(interaction, "randomise");
  const embed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle("You randomised the order of the movie list.");
  interaction.editReply({
    embeds: [embed],
    ephemeral: true,
  });
}

// Torrent
function getSelectedTorrent(interaction, id) {
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
