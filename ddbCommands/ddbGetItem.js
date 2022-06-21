const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient } = require("../libs/ddbDocClient.js");
const chalk = require("chalk");

// Set the parameters.
const params = {
  TableName: process.env.DDB_TABLE_NAME,
  Key: {},
};

const getItem = async (guildId) => {
  try {
    params.Key[process.env.DDB_KEY] = guildId.toString();
    const data = await ddbDocClient.send(new GetCommand(params));
    return data.Item;
  } catch (err) {
    console.log(chalk.red("Failed to get item from db."));
    console.error(err);
    return;
  }
};

module.exports = getItem;
