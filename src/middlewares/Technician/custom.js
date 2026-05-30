const ToolCounter = require("../../models/Tools/ToolCounter");
const Tool = require("../../models/Tools/tools.model");

/* -------------------- GENERATE TOOL IDENTIFIER -------------------- */
async function generateToolIdentifier(toolId) {
  if (!toolId) {
    throw new Error("toolId is required");
  }

  const counter = await ToolCounter.findOneAndUpdate(
    { tool_id: toolId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  const tool = await Tool.findById(toolId).select("code");
  if (!tool) {
    throw new Error("Tool not found");
  }

  const padded = String(counter.seq).padStart(4, "0");
  return `${tool.code}-${padded}`;
}

function getTotalAcQuantity(serviceDetails = []) {
  if (!Array.isArray(serviceDetails)) return 0;

  return serviceDetails.reduce((total, item) => {
    const qty = parseInt(item?.quantity, 10);
    return total + (Number.isNaN(qty) ? 0 : qty);
  }, 0);
}

const getDateRange = (filter) => {
  const now = new Date();
  let start, end;

  if (filter === "weekly") {
    start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);

    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  if (filter === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  if (filter === "yearly") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  return { start, end };
};

const normalizeDate = (date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const getMonthRange = (month, year) => {
  const now = new Date();

  const y = year ? Number(year) : now.getUTCFullYear();
  const m = month ? Number(month) - 1 : now.getUTCMonth();

  return {
    start: new Date(Date.UTC(y, m, 1)),
    end: new Date(Date.UTC(y, m + 1, 0)),
    year: y,
    month: m + 1,
  };
};

const dateKey = (date) => date.toISOString().split("T")[0];


module.exports = {
  generateToolIdentifier,
  getTotalAcQuantity,
  getDateRange,
  normalizeDate,
  getMonthRange,
  dateKey
};
