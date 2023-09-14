const path = require("path");
const core = require("@actions/core");
const minio = require("minio");

const BUCKET_NAME = "docs";
const EXPIRY_IN_SECONDS = 7 * 86400;

const input = {
  artifact: core.getInput("artifact", { required: true }),
  target: core.getInput("target", { required: false }),
  // expiryInSeconds: core.getInput("expiry-in-seconds", { required: false }),
  accessKey: core.getInput("access-key", { required: false }),
  secretKey: core.getInput("secret-Key", { required: false }),
};

const minioClient = new minio.Client({
  endPoint: "10.82.230.111",
  port: 9000,
  useSSL: false,
  accessKey: "minioadmin",
  secretKey: "minioadmin",
});

async function main(args) {
  const targetName = args.target || path.basename(args.artifact);
  try {
    const isBucketExist = await minioClient.bucketExists(BUCKET_NAME);
    if (isBucketExist === false) {
      await minioClient.makeBucket(BUCKET_NAME);
    }
    const objInfo = await minioClient.fPutObject(BUCKET_NAME, targetName, args.artifact, {});
    console.log("Success", objInfo.etag, objInfo.versionId);
    const url = await minioClient.presignedUrl("GET", BUCKET_NAME, targetName, EXPIRY_IN_SECONDS, objInfo, new Date());
    console.log(`Presign: {"method": "GET", "bucket": "${BUCKET_NAME}", url: ${url}}`);
    core.setOutput("result", "success");
    core.setOutput("url", url);
  } catch (e) {
    console.error(e);
    core.setOutput("result", "failure");
  }
}

main(input);
