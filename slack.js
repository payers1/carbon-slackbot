const qs = require("qs");
const AWS = require("aws-sdk");
const sqs = new AWS.SQS();
const prettier = require("prettier");
const QueueUrl = "https://sqs.us-east-1.amazonaws.com/676718483588/CarbonQueue";

module.exports.handler = async ({ body }, context, callback) => {
  const { response_url, text } = qs.parse(body);
  const cleanedText = text.replace(/[“”‘’]/g, "'");
  const formattedText = prettier.format(cleanedText, {
    parser: "babylon"
  });
  const params = {
    MessageBody: `Queuing`,
    MessageAttributes: {
      ResponseUrl: {
        DataType: "String",
        StringValue: response_url
      },
      Code: {
        DataType: "String",
        StringValue: Buffer.from(formattedText).toString("base64")
      }
    },
    QueueUrl
  };
  await sqs.sendMessage(params).promise();

  const ticks = "```";
  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      response_type: "in_channel",
      text: `${ticks}${formattedText}${ticks}`
    })
  };
  callback(null, response);
};
