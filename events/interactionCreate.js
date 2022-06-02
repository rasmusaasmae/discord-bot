const movie = require("../slashCommands/movie");

module.exports = (client, interaction) => {
  if (interaction.isCommand()) {
    // Command
    switch (interaction.commandName) {
      case "movie":
        switch (interaction.options._subcommand) {
          case "add":
            movie.add(interaction);
            break;
          case "remove":
            movie.execute(interaction);
            break;
          case "list":
            movie.list(interaction);
            break;
          case "clear":
            movie.clearMessages(interaction);
            break;
          case "randomise":
            movie.execute(interaction);
            break;
          case "torrents":
            movie.execute(interaction);
            break;
          case "torrent":
            movie.torrent(interaction);
            break;
          case "clearmessages":
            movie.clearMessages(interaction);
            break;

          default:
            break;
        }
        break;

      default:
        break;
    }
  } else if (interaction.isSelectMenu()) {
    // Selection menu
    if (interaction.customId === "movieAddMenu") {
      // Movie adding menu
      const id = interaction.values[0];
      movie.addMovie(interaction, id);
    } else if (interaction.customId === "movieTorrentMenu") {
      // Movie torrent menu
      const id = interaction.values[0];
      movie.getTorrent(interaction, id);
    }
  }
};
