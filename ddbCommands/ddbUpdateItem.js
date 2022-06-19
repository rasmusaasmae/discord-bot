const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient } = require("../libs/ddbDocClient");
const chalk = require("chalk");

const ddbUpdateItem = async (guildId, item) => {
  // Set the parameters.
  const params = {
    TableName: "discord-bot-db",
    Key: {
      guildId: guildId,
    },
    UpdateExpression: "set movieList = :ml, movieListMsgId = :msgId",
    ExpressionAttributeValues: {
      ":ml": item.movieList,
      ":msgId": item.movieListMsgId,
    },
  };
  try {
    const data = await ddbDocClient.send(new UpdateCommand(params));
    return true;
  } catch (err) {
    console.log(chalk.red("Failed to get item from db."));
    console.error(err);
    return false;
  }
};

module.exports = ddbUpdateItem;
