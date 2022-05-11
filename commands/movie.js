const discord = require("discord.js");
const axios = require("axios");
const chalk = require("chalk");
const _ = require("underscore");
const { color } = require("../config/config.json");

exports.run = (client, message, args) => {
  const { guildId } = message;
  if (!messages[guildId]) {
    messages[guildId] = {};
  }
  if (!searchResults[guildId]) {
    searchResults[guildId] = {};
  }
  if (!movieList[guildId]) {
    movieList[guildId] = [];
  }
  if (!nrOfActiveSelectionMenus[guildId]) {
    nrOfActiveSelectionMenus[guildId] = 0;
  }

  if (args.length === 0) return;
  const cmd = args.shift();
  switch (cmd) {
    case "add":
      searchMovies(message, args.join(" "));
      break;
    case "remove":
      removeMovies(message, args.join(" ").toLowerCase());
      break;
    case "list":
      listMovies(message);
      break;
    case "clear":
      clearMessages(message);
      break;
    case "randomise":
      randomiseMovies(message);
      break;
    case "torrents":
      break;
    case "torrent":
      break;
  }
  message.delete();
};

const movieList = {};
const searchResults = {};
const messages = {};
const nrOfActiveSelectionMenus = {};

function searchMovies(message, query) {
  const { guildId, channel, author } = message;
  const embed = new discord.MessageEmbed()
    .setAuthor({
      name: author.username,
      iconURL: author.avatarURL(),
    })
    .setColor(color);
  if (query == "") {
    embed.setTitle("Usage: movie add <query>");
    channel
      .send({ embeds: [embed] })
      .then((msg) => (messages[guildId][msg.id.toString()] = msg));
    return;
  }
  axios
    .get("https://yts.torrentbay.to/api/v2/list_movies.json", {
      params: { query_term: query },
    })
    .then((res) => {
      const movies = res["data"]["data"]["movies"];
      if (movies == undefined) {
        embed.setTitle(`No movies found for term '${query}'`);
        channel
          .send({ embeds: [embed] })
          .then((msg) => (messages[guildId][msg.id.toString()] = msg));
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
        const { id, imdb_code } = movie;
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

        searchResults[guildId][movie.id.toString()] = movie;
      }

      embed
        .setTitle(`Results for '${query}':`)
        .addFields(...movieFields)
        .setTimestamp()
        .setFooter({
          text: "Data from YTS",
        });

      const movieSelectMenu = new discord.MessageActionRow().addComponents(
        new discord.MessageSelectMenu()
          .setCustomId("movieAddMenu")
          .setPlaceholder("No movie selected")
          .addOptions([selectMenuFields])
      );

      channel
        .send({ embeds: [embed], components: [movieSelectMenu] })
        .then((msg) => (messages[guildId][msg.id.toString()] = msg));
      nrOfActiveSelectionMenus[guildId] += 1;
    })
    .catch((error) => {
      console.log(chalk.red(`Error in searchMovies(message, ${query})`));
      console.error(error);
    });
}

exports.addMovie = function (interaction, id) {
  const { guildId, user } = interaction;

  if (id == "NO_MOVIE_CHOSEN") {
    delete messages[guildId][interaction.message.id.toString()];
    interaction.message.delete();
    return;
  }

  const movie = searchResults[guildId][id];

  movieList[guildId].push(movie);
  const embed = new discord.MessageEmbed()
    .setColor(color)
    .setAuthor({
      name: user.username,
      iconURL: user.avatarURL(),
    })
    .setTitle(`${movie.title_long} was added to the list.`);
  interaction.update({
    embeds: [embed],
    components: [],
  });
  nrOfActiveSelectionMenus[guildId] -= 1;
  if (nrOfActiveSelectionMenus[guildId] == 0) {
    searchResults[guildId] = {};
  }
};

function removeMovies(message, query) {
  const { channel, guildId, author } = message;

  const embed = new discord.MessageEmbed().setColor(color).setAuthor({
    name: author.username,
    iconURL: author.avatarURL(),
  });
  if (movieList[guildId].length === 0) {
    embed.setTitle(
      "Can't remove any movies as there are no movies in the list"
    );
    channel
      .send({ embeds: [embed] })
      .then((msg) => (messages[guildId][msg.id.toString()] = msg));
    return;
  }
  const removedFields = [];
  for (let i = movieList[guildId].length - 1; i >= 0; i--) {
    if (movieList[guildId][i].title_long.toLowerCase().includes(query)) {
      removedFields.push({
        name: movieList[guildId][i].title_long,
        value: `https://www.imdb.com/title/${movieList[guildId][i].imdb_code}/`,
      });
      movieList[guildId].pop(i);
    }
  }
  embed
    .addFields(...removedFields)
    .setTitle("Removed the following movies from the list:");
  channel
    .send({ embeds: [embed] })
    .then((msg) => (messages[guildId][msg.id.toString()] = msg));
}

function listMovies(message) {
  const { channel, guildId, author } = message;

  const embed = new discord.MessageEmbed().setColor(color).setAuthor({
    name: author.username,
    iconURL: author.avatarURL(),
  });

  if (movieList[guildId].length === 0) {
    embed.setTitle("There are no movies in the list");
    channel
      .send({ embeds: [embed] })
      .then((msg) => (messages[guildId][msg.id.toString()] = msg));
    return;
  }
  const movieFields = [];
  for (movie of movieList[guildId]) {
    movieFields.push({
      name: movie.title_long,
      value: `https://www.imdb.com/title/${movie.imdb_code}/`,
    });
  }
  embed
    .setTitle(
      movieFields.length === 1
        ? "There is 1 movie in the list:"
        : `There are ${movieFields.length} movies in the list:`
    )
    .addFields(...movieFields);
  channel
    .send({ embeds: [embed] })
    .then((msg) => (messages[guildId][msg.id.toString()] = msg));
}

function clearMessages(message) {
  for (const msg of Object.values(messages[message.guildId])) {
    msg.delete();
  }
  messages[message.guildId] = {};
}

function randomiseMovies(message) {
  const { guildId } = message;
  movieList[guildId] = _.shuffle(movieList[guildId]);
  listMovies(message);
}
