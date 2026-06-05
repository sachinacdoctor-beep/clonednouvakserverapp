const User = require("../../models/User/user.model");
const Technician = require("../../models/Technician/technician.model");
const Booking = require("../../models/Bookings/booking.model");
const Enquiry = require("../../models/Enquiry/enquiry.model");
const moment = require("moment");

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const NEW_ENQUIRY_STATUSES = [
  "REQUESTED",
  "SCHEDULED",
  "QUOTE_SHARED",
  "FOLLOW_UP_REQUIRED",
];

const IN_PROGRESS_ENQUIRY_STATUSES = [
  "IN_PROGRESS",
  "INSPECTION_SCHEDULED",
  "INSPECTION_COMPLETED",
  "HOLD",
  "PAYMENT_PENDING",
  "QUOTE_ACCEPTED",
  "RESCHEDULED",
];

const COMPLETED_ENQUIRY_STATUSES = [
  "COMPLETED",
  "PAID",
  "BOOKING_CREATED",
];

const CANCELLED_ENQUIRY_STATUSES = ["CANCELLED"];

const USER_TYPE_META = {
  RETAIL: { label: "Retail", color: "#e94041", order: 1 },
  HNI: { label: "HNI", color: "#706f73", order: 2 },
  SME: { label: "SME", color: "#bdbcc1", order: 3 },
  LARGE_SCALE: { label: "Large Scale", color: "#c9c9c9", order: 4 },
  OEM: { label: "OEM", color: "#5b8def", order: 5 },
};

const KNOWN_USER_TYPES = Object.keys(USER_TYPE_META);

const toNumber = (value) => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (value?.$numberDecimal) return parseFloat(value.$numberDecimal) || 0;
  if (typeof value.toString === "function") return parseFloat(value.toString()) || 0;
  return 0;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getLastSevenDaysRange = () => {
  const end = endOfDay(new Date());
  const start = startOfDay(end);
  start.setDate(start.getDate() - 6);
  return { start, end };
};

const getChartRange = (period = "weekly") => {
  const end = endOfDay(new Date());
  if (period === "monthly") {
    const start = startOfDay(end);
    start.setDate(start.getDate() - 27);
    return { start, end, period: "monthly" };
  }
  const start = startOfDay(end);
  start.setDate(start.getDate() - 6);
  return { start, end, period: "weekly" };
};

const mapPaymentStatus = (status) => {
  if (["PAID", "COMPLETE"].includes(status)) return "Paid";
  if (status === "PAYMENT_PENDING") return "Pending";
  return "Unpaid";
};

const formatBookingSlot = (date, slot) => {
  const formattedDate = date ? moment(date).format("DD/MM/YYYY") : "—";
  const half =
    slot === "FIRST_HALF" ? "1st" : slot === "SECOND_HALF" ? "2nd" : "";
  return half ? `${formattedDate} - ${half}` : formattedDate;
};

const percentOf = (part, total) => {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
};

const niceChartMax = (max) => {
  if (max <= 0) return 10;
  if (max <= 10) return 10;
  if (max <= 20) return 20;
  if (max <= 40) return 40;
  if (max <= 80) return 80;
  const step = max <= 200 ? 20 : max <= 500 ? 50 : 100;
  return Math.ceil(max / step) * step;
};

const buildDailySeries = (rows, rangeStart, rangeEnd) => {
  const buckets = [];
  const cursor = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);

  while (cursor <= end) {
    buckets.push({
      date: new Date(cursor),
      day: DAY_LABELS[cursor.getDay()],
      rawValue: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  rows.forEach((row) => {
    const key = row._id;
    const count = row.count ?? row.value ?? 0;
    const rowDate = key instanceof Date ? key : new Date(key);
    if (Number.isNaN(rowDate.getTime())) return;

    const match = buckets.find(
      (b) => b.date.toDateString() === rowDate.toDateString(),
    );
    if (match) match.rawValue = count;
  });

  const peak = Math.max(...buckets.map((b) => b.rawValue), 0);
  const chartMax = niceChartMax(peak);

  return {
    chartMax,
    series: buckets.map((b, index) => ({
      day: b.day,
      rawValue: b.rawValue,
      value: chartMax
        ? Math.round((b.rawValue / chartMax) * chartMax)
        : 0,
      active: b.rawValue > 0 ? index % 2 === 0 : false,
    })),
  };
};

const buildMonthlyWeekSeries = (rows, rangeStart, rangeEnd) => {
  const end = endOfDay(rangeEnd);
  const weeks = [];

  for (let i = 3; i >= 0; i -= 1) {
    const weekEnd = endOfDay(end);
    weekEnd.setDate(end.getDate() - i * 7);
    const weekStart = startOfDay(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weeks.push({
      label: `W${4 - i}`,
      start: weekStart,
      end: weekEnd,
      rawValue: 0,
    });
  }

  rows.forEach((row) => {
    const rowDate = row._id instanceof Date ? row._id : new Date(row._id);
    if (Number.isNaN(rowDate.getTime())) return;
    const count = row.count ?? 0;
    const bucket = weeks.find(
      (w) => rowDate >= w.start && rowDate <= w.end,
    );
    if (bucket) bucket.rawValue += count;
  });

  const peak = Math.max(...weeks.map((w) => w.rawValue), 0);
  const chartMax = niceChartMax(peak);

  return {
    chartMax,
    series: weeks.map((w, index) => ({
      day: w.label,
      rawValue: w.rawValue,
      value: chartMax
        ? Math.round((w.rawValue / chartMax) * chartMax)
        : 0,
      active: w.rawValue > 0 ? index % 2 === 0 : false,
    })),
  };
};

const buildTaskSeries = (period, bookingRows, enquiryRows) => {
  const { start, end, period: rangePeriod } = getChartRange(period);

  if (rangePeriod === "monthly") {
    const booking = buildMonthlyWeekSeries(
      bookingRows.map((r) => ({ _id: new Date(r._id), count: r.count })),
      start,
      end,
    );
    const enquiry = buildMonthlyWeekSeries(
      enquiryRows.map((r) => ({ _id: new Date(r._id), count: r.count })),
      start,
      end,
    );
    return { bookings: booking, enquiries: enquiry };
  }

  return {
    bookings: buildDailySeries(
      bookingRows.map((r) => ({ _id: new Date(r._id), count: r.count })),
      start,
      end,
    ),
    enquiries: buildDailySeries(
      enquiryRows.map((r) => ({ _id: new Date(r._id), count: r.count })),
      start,
      end,
    ),
  };
};

const buildUserTypeSegments = (userTypeCounts, totalUsers) => {
  const countMap = userTypeCounts.reduce((acc, row) => {
    const key = row._id ? String(row._id) : "UNKNOWN";
    acc[key] = row.count;
    return acc;
  }, {});

  const keys = new Set([...KNOWN_USER_TYPES, ...Object.keys(countMap)]);

  const rows = Array.from(keys).map((key) => {
    const meta = USER_TYPE_META[key] || {
      label: key.replace(/_/g, " "),
      color: "#888888",
      order: 99,
    };
    const count = countMap[key] || 0;
    const percent = percentOf(count, totalUsers);
    return {
      label: meta.label,
      key,
      percent,
      value: `${percent}%`,
      color: meta.color,
      count,
      order: meta.order,
    };
  });

  return rows
    .sort((a, b) => a.order - b.order || b.count - a.count)
    .map(({ order, ...seg }) => seg);
};

const niceRevenueMax = (peak) => {
  if (peak <= 0) return 25000;
  if (peak <= 1000) return 1000;
  if (peak <= 5000) return Math.ceil(peak / 500) * 500;
  if (peak <= 10000) return Math.ceil(peak / 1000) * 1000;
  if (peak <= 25000) return Math.ceil(peak / 2500) * 2500;
  return Math.ceil(peak / 5000) * 5000;
};

const buildRevenueWeekly = (rangeStart, rangeEnd, incomeRows, expenseRows) => {
  const days = [];
  const cursor = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);

  while (cursor <= end) {
    const key = moment(cursor).format("YYYY-MM-DD");
    const incomeRow = incomeRows.find((r) => r._id === key);
    const expenseRow = expenseRows.find((r) => r._id === key);
    days.push({
      day: DAY_LABELS[cursor.getDay()],
      dateKey: key,
      label: `${DAY_LABELS[cursor.getDay()]} ${cursor.getDate()}`,
      income: Math.round(toNumber(incomeRow?.total)),
      expenses: Math.round(toNumber(expenseRow?.total)),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const buildRevenueMonthly = (rangeEnd, incomeRows, expenseRows) => {
  const end = endOfDay(rangeEnd);
  const weeks = [];

  for (let i = 3; i >= 0; i -= 1) {
    const weekEnd = endOfDay(end);
    weekEnd.setDate(end.getDate() - i * 7);
    const weekStart = startOfDay(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weeks.push({
      label: `W${4 - i}`,
      start: weekStart,
      end: weekEnd,
      income: 0,
      expenses: 0,
    });
  }

  const addToWeek = (rows, field) => {
    rows.forEach((row) => {
      const rowDate = new Date(row._id);
      if (Number.isNaN(rowDate.getTime())) return;
      const bucket = weeks.find(
        (w) => rowDate >= w.start && rowDate <= w.end,
      );
      if (bucket) bucket[field] += toNumber(row.total);
    });
  };

  addToWeek(incomeRows, "income");
  addToWeek(expenseRows, "expenses");

  return weeks.map((w) => ({
    day: w.label,
    dateKey: w.label,
    label: w.label,
    income: Math.round(w.income),
    expenses: Math.round(w.expenses),
  }));
};

const buildRevenueSeries = (
  period,
  rangeStart,
  rangeEnd,
  incomeRows,
  expenseRows,
) => {
  if (period === "monthly") {
    return buildRevenueMonthly(rangeEnd, incomeRows, expenseRows);
  }
  return buildRevenueWeekly(rangeStart, rangeEnd, incomeRows, expenseRows);
};

const sumRevenue = async (match = {}) => {
  const result = await Booking.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $cond: [
              { $ifNull: ["$grandTotal", false] },
              { $toDouble: "$grandTotal" },
              { $toDouble: "$amount" },
            ],
          },
        },
      },
    },
  ]);
  return toNumber(result[0]?.total);
};

exports.getDashboardData = async (options = {}) => {
  const period = options.period === "monthly" ? "monthly" : "weekly";
  const taskMetric = options.taskMetric === "enquiries" ? "enquiries" : "bookings";

  const now = new Date();
  const { start: lastWeekStart, end: lastWeekEnd } = getLastSevenDaysRange();
  const { start: chartStart, end: chartEnd } = getChartRange(period);
  const thirtyDaysAgo = startOfDay(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    totalTechnicians,
    totalBookings,
    totalEnquiries,
    totalRevenue,
    lastWeekUsers,
    lastWeekTechnicians,
    lastWeekBookings,
    lastWeekEnquiries,
    lastWeekRevenue,
    enquiryStatusCounts,
    userTypeCounts,
    weeklyBookingCounts,
    weeklyEnquiryCounts,
    weeklyRevenueByDay,
    weeklyExpenseByDay,
    newUsersCount,
    returningUsersCount,
    recentBookingsRaw,
    completedBookingsCount,
    pendingBookingsCount,
    propertyTypeCounts,
  ] = await Promise.all([
    User.countDocuments({ isActive: { $ne: 0 } }),
    Technician.countDocuments({}),
    Booking.countDocuments({}),
    Enquiry.countDocuments({}),
    sumRevenue({ status: { $in: ["PAID", "COMPLETE"] } }),
    User.countDocuments({ createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd } }),
    Technician.countDocuments({ createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd } }),
    Booking.countDocuments({ createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd } }),
    Enquiry.countDocuments({ createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd } }),
    sumRevenue({
      status: { $in: ["PAID", "COMPLETE"] },
      createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
    }),
    Enquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    User.aggregate([
      { $match: { isActive: { $ne: 0 } } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { createdAt: { $gte: chartStart, $lte: chartEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Enquiry.aggregate([
      { $match: { createdAt: { $gte: chartStart, $lte: chartEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          status: { $in: ["PAID", "COMPLETE"] },
          $or: [
            { createdAt: { $gte: chartStart, $lte: chartEnd } },
            { date: { $gte: chartStart, $lte: chartEnd } },
          ],
        },
      },
      { $addFields: { chartDate: { $ifNull: ["$date", "$createdAt"] } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$chartDate" } },
          total: {
            $sum: {
              $cond: [
                { $ifNull: ["$grandTotal", false] },
                { $toDouble: "$grandTotal" },
                { $toDouble: "$amount" },
              ],
            },
          },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          status: "PAYMENT_PENDING",
          createdAt: { $gte: chartStart, $lte: chartEnd },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: {
            $sum: {
              $cond: [
                { $ifNull: ["$grandTotal", false] },
                { $toDouble: "$grandTotal" },
                { $toDouble: "$amount" },
              ],
            },
          },
        },
      },
    ]),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Booking.aggregate([
      { $group: { _id: "$user_id", bookings: { $sum: 1 } } },
      { $match: { bookings: { $gte: 2 } } },
      { $count: "count" },
    ]),
    Booking.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_info",
        },
      },
      {
        $lookup: {
          from: "technicians",
          localField: "assigned_to",
          foreignField: "_id",
          as: "technician_data",
        },
      },
      {
        $project: {
          bookingId: 1,
          status: 1,
          date: 1,
          slot: 1,
          userName: { $ifNull: [{ $arrayElemAt: ["$user_info.name", 0] }, ""] },
          userPhone: {
            $ifNull: [{ $arrayElemAt: ["$user_info.phoneNumber", 0] }, ""],
          },
          techName: {
            $ifNull: [{ $arrayElemAt: ["$technician_data.name", 0] }, ""],
          },
        },
      },
    ]),
    Booking.countDocuments({ status: { $in: ["PAID", "COMPLETE"] } }),
    Booking.countDocuments({
      status: { $in: ["BOOKED", "ASSIGNMENT_PENDING", "PAYMENT_PENDING", "IN_PROGRESS"] },
    }),
    Enquiry.aggregate([
      { $match: { "details.propertyType": { $exists: true, $ne: null } } },
      { $group: { _id: "$details.propertyType", count: { $sum: 1 } } },
    ]),
  ]);

  const statusMap = enquiryStatusCounts.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  const countByStatuses = (statuses) =>
    statuses.reduce((sum, status) => sum + (statusMap[status] || 0), 0);

  const newEnquiryCount = countByStatuses(NEW_ENQUIRY_STATUSES);
  const inProgressCount = countByStatuses(IN_PROGRESS_ENQUIRY_STATUSES);
  const completedCount = countByStatuses(COMPLETED_ENQUIRY_STATUSES);
  const cancelledCount = countByStatuses(CANCELLED_ENQUIRY_STATUSES);

  const segments = buildUserTypeSegments(userTypeCounts, totalUsers);
  const taskSeries = buildTaskSeries(period, weeklyBookingCounts, weeklyEnquiryCounts);
  const activeTasks =
    taskMetric === "enquiries" ? taskSeries.enquiries : taskSeries.bookings;

  const revenueDays = buildRevenueSeries(
    period,
    chartStart,
    chartEnd,
    weeklyRevenueByDay,
    weeklyExpenseByDay,
  );

  const weekRevenueTotal = revenueDays.reduce((sum, d) => sum + d.income, 0);
  const incomePeak = Math.max(...revenueDays.map((d) => d.income), 0);
  const expensePeak = Math.max(...revenueDays.map((d) => d.expenses), 0);
  const revenueChartMax = niceRevenueMax(
    Math.max(incomePeak, expensePeak),
  );

  const returningCount = returningUsersCount[0]?.count ?? 0;
  const engagementRate = returningCount / Math.max(totalUsers, 1);
  const completionRate = completedBookingsCount / Math.max(totalBookings, 1);
  const performanceScore = Math.min(
    500,
    Math.round((engagementRate * 0.45 + completionRate * 0.55) * 500),
  );

  const propertyTypes = propertyTypeCounts.map((row) => ({
    type: row._id || "UNKNOWN",
    count: row.count,
    percent: percentOf(row.count, totalEnquiries),
  }));

  return {
    filters: { period, taskMetric },
    summary: {
      totalUsers,
      totalTechnicians,
      totalBookings,
      totalEnquiries,
      totalRevenue: Math.round(totalRevenue),
      pendingBookings: pendingBookingsCount,
      lastWeek: {
        users: lastWeekUsers,
        technicians: lastWeekTechnicians,
        bookings: lastWeekBookings,
        enquiries: lastWeekEnquiries,
        revenue: Math.round(lastWeekRevenue),
      },
    },
    enquiries: {
      total: totalEnquiries,
      new: { count: newEnquiryCount, percent: percentOf(newEnquiryCount, totalEnquiries) },
      inProgress: {
        count: inProgressCount,
        percent: percentOf(inProgressCount, totalEnquiries),
      },
      completed: {
        count: completedCount,
        percent: percentOf(completedCount, totalEnquiries),
      },
      cancelled: {
        count: cancelledCount,
        percent: percentOf(cancelledCount, totalEnquiries),
      },
    },
    weeklyTasks: {
      period,
      metric: taskMetric,
      chartMax: activeTasks.chartMax,
      series: activeTasks.series,
      bookingsSeries: taskSeries.bookings.series,
      enquiriesSeries: taskSeries.enquiries.series,
    },
    revenue: {
      period,
      total: weekRevenueTotal,
      allTimeTotal: Math.round(totalRevenue),
      weekly: revenueDays,
      maxValue: revenueChartMax,
    },
    userPerformance: {
      score: performanceScore,
      min: 0,
      max: 500,
      newUsers: newUsersCount,
      returningUsers: returningCount,
      totalUsers,
    },
    overallPerformance: {
      totalCount: totalUsers,
      segments,
    },
    propertyTypes,
    recentBookings: recentBookingsRaw.map((row) => ({
      id: row.bookingId || "—",
      user: row.userName || "—",
      tech: row.techName || "—",
      contact: row.userPhone || "—",
      slot: formatBookingSlot(row.date, row.slot),
      payment: mapPaymentStatus(row.status),
      status: row.status,
    })),
  };
};
