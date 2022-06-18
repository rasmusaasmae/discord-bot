const chalk = require("chalk");
const { prefix } = require("../config/config.json");

// Log that plot is ready
module.exports = (client) => {
  client.user.setActivity(`slash commands :)`, {
    type: "WATCHING",
  });
  console.log(chalk.green("Bot ready!"));
  console.log(chalk.green(`Prefix is ${prefix}`));
  console.log(chalk.blue("Made by Rasmus#1234"));
};
