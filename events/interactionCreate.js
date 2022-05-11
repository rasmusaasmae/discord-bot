const movie = require("../commands/movie");
module.exports = (client, interaction) => {
  if (!interaction.isSelectMenu()) return;

  if (interaction.customId === "movieAddMenu") {
    const id = interaction.values[0];
    movie.addMovie(interaction, id);
  }
};
