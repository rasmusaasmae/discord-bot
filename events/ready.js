const chalk = require("chalk");
const config = require("../config/config.json");

// Log that plot is ready
module.exports = (client) => {
  client.user.setActivity(`slash commands :)`, {
    type: "WATCHING",
  });
  console.log(chalk.green("Bot ready!"));
  console.log(chalk.yellow(`Prefix is ${config.prefix}`));
  console.log(chalk.blue("Made by Rasmus#1234"));
};
