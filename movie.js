const axios = require("axios");
const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
} = require("discord.js");

class Movie {
  constructor(client) {
    this.client = client;
    this.movieList = [];
    this.searchResult = {};
  }

  action(channel, args) {
    const cmd = args[0];
    args = args.splice(1);
    switch (cmd) {
      case "add":
        this.searchMovie(channel, args.join(" "));
        break;
      case "randomise":
        channel.send(`${user} called method "${cmd}" with args "${args}"`);
        break;
      case "torrents":
        channel.send(`${user} called method "${cmd}" with args "${args}"`);
        break;
      case "torrent":
        channel.send(`${user} called method "${cmd}" with args "${args}"`);
        break;
    }
  }

  searchMovie(channel, query) {
    axios
      .get("https://yts.torrentbay.to/api/v2/list_movies.json", {
        params: { query_term: query },
      })
      .then((res) => {
        const movies = res["data"]["data"]["movies"];
        if (movies == undefined) {
          channel.send(`No movies found for query "${query}"`);
          return;
        }
        const embedResults = [];
        const selectMenuResults = [];
        for (let movie of movies) {
          const {
            id,
            url,
            title,
            title_long,
            year,
            rating,
            torrents,
            imdb_code,
          } = movie;
          const imdb = `https://www.imdb.com/title/${imdb_code}/`;

          embedResults.push({
            name: title_long,
            value: imdb,
          });
          selectMenuResults.push({
            label: title_long,
            description: url,
            value: `${id}:::${title_long}`,
          });

          this.searchResult[`${id}`] = movie;
        }
        const embed = new MessageEmbed()
          .setColor("#0099ff")
          .setTitle(`Results for "${query}"`)
          .setDescription("Data from YTS database")
          .addFields(...embedResults)
          .setTimestamp()
          .setFooter({
            text: "Tegin seda kui oleksin pidanud eksamiteks õppima",
          });

        const row = new MessageActionRow().addComponents(
          new MessageSelectMenu()
            .setCustomId("movieAddMenu")
            .setPlaceholder("No movie selected")
            .addOptions([selectMenuResults])
        );

        channel.send({ embeds: [embed], components: [row] });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  addMovie(id) {
    this.movieList.push(this.searchResult[id]);
  }

  randomise() {}

  getAll() {}
}

module.exports = Movie;
