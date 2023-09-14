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
  endPoint: "127.0.0.1",
  port: 9000,
  useSSL: false,
  accessKey: "minioadmin",
  secretKey: "minioadmin",
});

/**
 * 
 * @param {string} bucketName 
 */
const bucketExists = async (bucketName) => {
  return new Promise((resolve, reject) => {
    minioClient.bucketExists(bucketName, (err, exists) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      if (exists === false) {
        console.error(`Bucket(${bucketName}) does not exist.`);
        return resolve(false);
      }
      console.log(`Bucket(${bucketName}) exists.`);
      return resolve(true);
    });
  });
};

/**
 * 
 * @param {string} bucketName
 * @param {string} region
 */
const makeBucket = async (bucketName, region = "us-east-1") => {
  return new Promise((resolve, reject) => {
    minioClient.makeBucket(bucketName, region, (err) => {
      if (err) {
        console.error(`Error creating bucket(${bucketName}).`, err);
        return reject(err);
      }
      return resolve();
    });
  });
};

/**
 * 
 * @param {string} bucketName 
 * @param {string} objectName 
 * @param {string} filePath 
 * @param {object} metaData 
 */
const fPutObject = async (bucketName, objectName, filePath, metaData) => {
  return new Promise((resolve, reject) => {
    minioClient.fPutObject(bucketName, objectName, filePath, metaData, (err, objInfo) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      console.log("Success", objInfo.etag, objInfo.versionId);
      return resolve(objInfo);
    });
  });
};

/**
 * 
 * @param {string} httpMethod
 * @param {string} bucketName 
 * @param {string} objectName 
 * @param {number} expiry 
 * @param {object} reqParams 
 * @param {Date} requestDate 
 * @returns 
 */
const presignedUrl = async (httpMethod, bucketName, objectName, expiry, reqParams, requestDate) => {
  return new Promise((resolve, reject) => {
    minioClient.presignedUrl(httpMethod, bucketName, objectName, (err, presignedUrl) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      return resolve(presignedUrl);
    });
  });
};

async function main(args) {
  const targetName = args.target || path.basename(args.artifact);
  try {
    const isBucketExist = await bucketExists(BUCKET_NAME);
    if (isBucketExist === false) {
      await makeBucket(BUCKET_NAME);
    }
    const objInfo = await fPutObject(BUCKET_NAME, targetName, args.artifact, {});
    const url = presignedUrl("GET", BUCKET_NAME, targetName, EXPIRY_IN_SECONDS, objInfo, Date.now());
    core.setOutput("result", "success");
    core.setOutput("url", url);
  } catch (e) {
    console.error(e);
    core.setOutput("result", "failure");
  }
}

main(input);
