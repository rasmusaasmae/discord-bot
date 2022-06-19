const { ListTablesCommand } = require("@aws-sdk/client-dynamodb");
const { ddbClient } = require("../libs/ddbClient.js");

const ListTables = async () => {
  try {
    const data = await ddbClient.send(new ListTablesCommand({}));
    console.log(data);
    // console.log(data.TableNames.join("\n"));
    return data;
  } catch (err) {
    console.error(err);
    return;
  }
};
module.exports = ListTables;
