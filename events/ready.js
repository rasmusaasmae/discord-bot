const chalk = require("chalk");
const config = require("../config/config.json");
module.exports = (client) => {
  console.log(chalk.yellow(`Prefix is ${config.prefix}`));
  console.log(chalk.blue("Bot Made by Rasmus#1234"));
};
