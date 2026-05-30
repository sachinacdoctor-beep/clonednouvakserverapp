
const OldAcEnquiryDetail = require("../../src/models/Enquiry/oldAcEnquiry");
const { deleteMultipleFromS3 } = require("../Utils/s3");

// const handleOldAcEnquiry = async ({ enquiryId, oldAcDetails }) => {
//   // Validation
//   if (
//     !oldAcDetails ||
//     !Array.isArray(oldAcDetails) ||
//     oldAcDetails.length === 0
//   ) {
//     throw new Error("Old AC details are required for OLD_AC enquiry");
//   }

//   const oldAcDoc = await OldAcEnquiryDetail.create({
//     enquiryId,
//     oldAcDetails,
//   });

//   return {
//     oldAcDoc,
//     noOfAc: oldAcDetails.length,
//   };
// };

const handleOldAcEnquiry = async ({
  enquiryId,
  oldAcDetails,
  totalNoOfAC,
  brand,
  propertyType,
  alternateNumber,
}) => {
  const hasDetailed = Array.isArray(oldAcDetails) && oldAcDetails.length > 0;

  const hasAnyBulk = totalNoOfAC || propertyType || alternateNumber || brand;

  // Nothing provided
  if (!hasDetailed && !hasAnyBulk) {
    throw new Error("Provide at least oldAcDetails or any bulk field");
  }

  const payload = { enquiryId };

  // Detailed
  if (hasDetailed) {
    payload.oldAcDetails = oldAcDetails;
  }

  // Bulk (independent fields)
  if (totalNoOfAC) payload.totalNoOfAC = totalNoOfAC;
  if (brand) payload.brand = brand;
  if (propertyType) payload.propertyType = propertyType;
  if (alternateNumber) payload.alternateNumber = alternateNumber;

  const oldAcDoc = await OldAcEnquiryDetail.create(payload);

  // Count logic
  let noOfAc = 0;

  if (hasDetailed && totalNoOfAC) {
    // noOfAc = oldAcDetails.length + totalNoOfAC;
    noOfAc = oldAcDetails.length;
  } else if (hasDetailed) {
    noOfAc = oldAcDetails.length;
  } else if (totalNoOfAC) {
    noOfAc = totalNoOfAC;
  }

  return { oldAcDoc, noOfAc };
};

const cleanupOldAcPhotos = async (oldAcDetails = []) => {
  try {
    if (!Array.isArray(oldAcDetails) || oldAcDetails.length === 0) return;

    const allPhotos = oldAcDetails.flatMap((ac) =>
      Array.isArray(ac.photos) ? ac.photos : []
    );

    if (allPhotos.length > 0) {
      await deleteMultipleFromS3(allPhotos);
    }

  } catch (error) {
    console.error("Old AC photos cleanup failed:", error.message);
  }
};

const cleanupCopperPipingImages = async (images = []) => {
  try {
    if (!Array.isArray(images) || images.length === 0) return;

    await deleteMultipleFromS3(images);
  } catch (error) {
    console.error("Copper piping images cleanup failed:", error.message);
  }
};

module.exports = {
  handleOldAcEnquiry,
  cleanupOldAcPhotos,
  cleanupCopperPipingImages
};
