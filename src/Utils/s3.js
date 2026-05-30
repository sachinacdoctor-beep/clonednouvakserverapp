const AWS = require('aws-sdk');
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { getFolderPath } = require("./common");

// DEPRECATED: AWS.config.update is no longer recommended. Using s3Storage instance instead.
// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });
// const s3 = new AWS.S3();

const s3Storage = new AWS.S3({
  region: process.env.AWS_REGION,
  signatureVersion: "v4",
});

function uploadToS3 (uploadParams) {
    return new Promise((resolve, reject) => {
        s3Storage.upload(uploadParams, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
    });
}

async function getPresignedUrl (fileName, fileType, type) {
    const bucketName = process.env.BUCKET_NAME;
    const folderPath = getFolderPath(type);
    const fullPath = `${folderPath}/${fileName}`;

    const params = {
        Bucket: bucketName,
        Key: fullPath,
        Expires: 600,
        ContentType: fileType,
    };
    const url = await s3Storage.getSignedUrlPromise("putObject", params);
    return url;
}

async function getMultiplePresignedUrls(files, type) {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error("Files array is required");
    }

    const bucketName = process.env.BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const folderPath = getFolderPath(type);

    const results = await Promise.all(
      files.map(async (file) => {
        const { fileName, fileType } = file;

        if (!fileName || !fileType) {
          throw new Error("Each file must contain fileName and fileType");
        }

        const extension = path.extname(fileName);
        const baseName = path.basename(fileName, extension);
        const uniqueFileName = `${baseName}-${uuidv4()}${extension}`;

        const fullPath = `${folderPath}/${uniqueFileName}`;

        const params = {
          Bucket: bucketName,
          Key: fullPath,
          Expires: 600,
          ContentType: fileType,
        };

        const uploadUrl = await s3Storage.getSignedUrlPromise(
          "putObject",
          params
        );

        return {
          fileName,
          uploadUrl,
          fileKey: fullPath,
          fileUrl: `https://${bucketName}.s3.${region}.amazonaws.com/${fullPath}`,
        };
      })
    );

    return results;

  } catch (error) {
    console.error("Multiple Presigned URL Error:", error);
    throw error;
  }
}

const deleteMultipleFromS3 = async (files) => {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error("Files array is required");
    }

    const bucketName = process.env.BUCKET_NAME;

    const objects = files.map((file) => {
      let key = file;

      if (file.startsWith("http")) {
        const url = new URL(file);
        key = decodeURIComponent(url.pathname.slice(1));
      }

      return { Key: key };
    });

    const params = {
      Bucket: bucketName,
      Delete: {
        Objects: objects,
        Quiet: false,
      },
    };

    const result = await s3Storage.deleteObjects(params).promise();

    console.log(result,"This is my result")

    return result;

  } catch (error) {
    console.error("S3 Multi Delete Error:", error);
    throw error;
  }
};

const cleanupServiceReportPhotos = async (acs = []) => {
  try {
    if (!Array.isArray(acs) || acs.length === 0) return;

    const allPhotos = [];

    acs.forEach((ac) => {
      if (Array.isArray(ac.beforePhotos)) {
        allPhotos.push(...ac.beforePhotos);
      }

      if (Array.isArray(ac.afterPhotos)) {
        allPhotos.push(...ac.afterPhotos);
      }
    });

    if (allPhotos.length > 0) {
      await deleteMultipleFromS3(allPhotos);
    }

  } catch (error) {
    console.error("Cleanup service report photos error:", error);
  }
};

const safeDelete = async (files) => {
  if (!files) return;

  try {
    const fileArray = Array.isArray(files) ? files : [files];
    await deleteMultipleFromS3(fileArray);
  } catch (err) {
    console.error("S3 cleanup failed:", err.message);
  }
};


module.exports ={uploadToS3, s3Storage, getPresignedUrl ,deleteMultipleFromS3, getMultiplePresignedUrls ,cleanupServiceReportPhotos,safeDelete}; 