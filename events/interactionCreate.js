const movie = require("../commands/movie");

// called when interaction event happens
module.exports = (client, interaction) => {
  // no nothing if not menu selection
  if (!interaction.isSelectMenu()) return;

  // if movie was selected calls function to respond
  if (interaction.customId === "movieAddMenu") {
    const id = interaction.values[0];
    movie.addMovie(interaction, id);
  }
};
