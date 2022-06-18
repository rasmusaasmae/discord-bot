const movie = require("../slashCommands/movie");

module.exports = (client, interaction) => {
  if (interaction.isCommand()) {
    // Command
    switch (interaction.commandName) {
      case "movie":
        switch (interaction.options._subcommand) {
          case "add":
            movie.addMovie(interaction);
            break;
          case "remove":
            movie.removeMovie(interaction);
            break;
          case "list":
            movie.listMovies(interaction);
            break;
          case "clear":
            movie.clearMovieList(interaction);
            break;
          case "randomise":
            movie.randomiseMovieList(interaction);
            break;
          case "torrent":
            movie.torrent(interaction);
            break;

          default:
            break;
        }
        break;

      default:
        break;
    }
  } else if (interaction.isSelectMenu()) {
    const id = interaction.values[0];
    switch (interaction.customId) {
      case "movieAddMenu":
        // Movie adding menu
        movie.addSelectedMovie(interaction, id);
        break;
      case "movieTorrentMenu":
        // Movie torrent menu
        movie.getSelectedTorrent(interaction, id);
        break;
      case "movieRemoveMenu":
        // Movie removing menu
        movie.removeSelectedMovie(interaction, id);
        break;
      default:
        break;
    }
  }
};
