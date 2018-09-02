const P = require("bluebird");
const rp = require("request-promise");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const crypto = require("crypto");
const { BUCKET } = process.env;

module.exports.handler = ({ Records }, context, callback) => {
  return P.map(Records, async record => {
    const { messageAttributes } = record;
    const responseUrl = messageAttributes.ResponseUrl.stringValue;
    const code = messageAttributes.Code.stringValue;
    const filename = await saveFileToS3(code);
    const options = {
      url: responseUrl,
      method: "POST",
      json: true,
      body: {
        response_type: "in_channel",
        attachments: [
          {
            fallback: "code...",
            image_url: `https://s3.amazonaws.com/${BUCKET}/${filename}`
          }
        ]
      }
    };
    return rp(options);
  });
};

async function saveFileToS3(code) {
  const rand = crypto.randomBytes(16).toString("hex");
  const filename = `${rand}.png`;
  const codeString = Buffer.from(code, "base64").toString();
  const state = {
    backgroundColor: "rgba(171, 184, 195, 1)",
    code: codeString,
    dropShadow: true,
    dropShadowBlurRadius: "68px",
    dropShadowOffsetY: "20px",
    exportSize: "2x",
    fontFamily: "Anonymous Pro",
    fontSize: "14px",
    language: "javascript",
    lineHeight: "133%",
    lineNumbers: true,
    paddingHorizontal: "10px",
    paddingVertical: "10px",
    squaredImage: false,
    theme: "seti",
    timestamp: false,
    watermark: false,
    widthAdjustment: true,
    windowControls: false,
    windowTheme: "bw"
  };
  const stateString = encodeURIComponent(JSON.stringify(state));
  const base64StateString = Buffer.from(stateString).toString("base64");
  const { dataUrl } = await rp({
    method: "POST",
    url: "https://carbon-api.now.sh/image",
    json: true,
    body: { state: base64StateString }
  });
  const data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const params = {
    Body: Buffer.from(data, "base64"),
    Key: filename,
    Bucket: BUCKET,
    ACL: "public-read"
  };
  await s3.putObject(params).promise();
  return filename;
}
