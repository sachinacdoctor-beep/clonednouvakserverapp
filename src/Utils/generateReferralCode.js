// generateReferralCode.js
const generateReferralCode = () => {
  const letters = Array.from({ length: 3 })
    .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
    .join("");

  const digits = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `ACD-${letters}${digits}`;
};

module.exports = { generateReferralCode };
