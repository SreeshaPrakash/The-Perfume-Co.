


const mongoose = require("mongoose");
const path = require("path");
const User = require("../../models/userschema"); // Adjust path as needed
const Order = require("../../models/orderschema"); // Adjust path as needed
const Product = require("../../models/productschema"); // Adjust path as needed
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");


const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      const totalUsers = await User.countDocuments({ isAdmin: false });
      const totalProducts = await Product.countDocuments();
      const totalOrders = await Order.countDocuments();

      const topProductsData = await getTopProductsData();
      const topCategoriesData = await getTopCategoriesData();
      const topBrandsData = await getTopBrandsData();

      const orders = await Order.find();
      console.log(orders);
      const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.finalAmount || 0),
        0
      );
      const totalDiscount = orders.reduce(
        (sum, order) => sum + (order.discount || 0),
        0
      );

      // Previous and Current Month Calculation
      const previousMonthStart = new Date();
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      previousMonthStart.setDate(1);
      previousMonthStart.setHours(0, 0, 0, 0);

      const previousMonthEnd = new Date(previousMonthStart);
      previousMonthEnd.setMonth(previousMonthEnd.getMonth() + 1);
      previousMonthEnd.setDate(0);
      previousMonthEnd.setHours(23, 59, 59, 999);

      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      const prevMonthUsers = await User.countDocuments({
        isAdmin: false,
        createdAt: { $lt: currentMonthStart },
      });

      const prevMonthProducts = await Product.countDocuments({
        createdAt: { $lt: currentMonthStart },
      });

      const prevMonthOrders = await Order.countDocuments({
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      });

      const prevMonthRevenue = (
        await Order.find({
          createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
        })
      ).reduce((sum, order) => sum + (order.finalAmount || 0), 0);

      const totalUsersGrowth =
        prevMonthUsers > 0
          ? (((totalUsers - prevMonthUsers) / prevMonthUsers) * 100).toFixed(1)
          : 5.3;
      const totalProductsGrowth =
        prevMonthProducts > 0
          ? (
              ((totalProducts - prevMonthProducts) / prevMonthProducts) *
              100
            ).toFixed(1)
          : 7.1;

      const currentMonthOrders = await Order.countDocuments({
        createdAt: { $gte: currentMonthStart },
      });

      const totalOrdersGrowth =
        prevMonthOrders > 0
          ? ((currentMonthOrders / prevMonthOrders) * 100 - 100).toFixed(1)
          : 3.2;

      const currentMonthRevenue = (
        await Order.find({
          createdAt: { $gte: currentMonthStart },
        })
      ).reduce((sum, order) => sum + (order.finalAmount || 0), 0);

      const totalRevenueGrowth =
        prevMonthRevenue > 0
          ? ((currentMonthRevenue / prevMonthRevenue) * 100 - 100).toFixed(1)
          : 8.9;

      const recentOrders = await Order.find()
        .populate("userId", "firstName lastName email")
        .populate("orderItems.product", "productName")
        .sort({ createdAt: -1 })
        .limit(5);

      const formattedRecentOrders = recentOrders.map((order) => ({
        orderId: order.orderId,
        customerName: order.userId
          ? `${order.userId.firstName} ${order.userId.lastName}`
          : "Unknown Customer",
        productName:
          order.orderItems.length > 0 && order.orderItems[0].product
            ? order.orderItems[0].product.productName
            : "Unknown Product",
        amount: order.finalAmount,
        status: order.orderItems[0]?.status || "Processing",
        date: order.createdAt,
      }));

      // Fetch monthly data and destructure it
      const { revenueData, ordersData, chartLabels } = await getMonthlyData();
      console.log("Monthly data:", { revenueData, ordersData, chartLabels });

      console.log("Top products:", topProductsData);
      console.log("Top categories:", topCategoriesData);
      console.log("Top brands:", topBrandsData);

      res.render("dashboard", {
        totalDiscount,
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        totalUsersGrowth,
        totalProductsGrowth,
        totalOrdersGrowth,
        totalRevenueGrowth,
        recentOrders: formattedRecentOrders,
        chartData: {
          revenueData,
          ordersData,
          chartLabels,
          topProducts: topProductsData,
          topCategories: topCategoriesData,
          topBrands: topBrandsData,
        },
      });
    } catch (error) {
      console.error("Dashboard Error:", error);
      res.render("error occuredd peanthhh", { message: "Error loading dashboard", error });
      return;
    }
  } else {
    res.redirect("/admin/login");
  }
};

// -------------------------------------------------------------------------------------

const getSalesReportData = async (startDate, endDate, period) => {
  let dateFilter = {};

  if (period === "custom" && startDate && endDate) {
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    dateFilter = { Date: { $gte: new Date(start), $lte: new Date(end) } };
  }

  if (period === "daily") {
    dateFilter = {
      Date: {
        $gte: new Date(new Date().setHours(0, 0, 0)),
        $lt: new Date(),
      },
    };
  } else if (period === "weekly") {
    dateFilter = {
      Date: {
        $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        $lt: new Date(),
      },
    };
  } else if (period === "monthly") {
    dateFilter = {
      Date: {
        $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        $lt: new Date(),
      },
    };
  } else if (period === "yearly") {
    dateFilter = {
      Date: {
        $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        $lt: new Date(),
      },
    };
  }

  return dateFilter;
};

// -------------------------------------------------------------------------------------

const downloadReport = async (req, res) => {
  try {
    const { reportType, reportFormat, startDate, endDate } = req.query;
    console.log(req.query);
    // const { startDate: start, endDate: end } = getDateRange(
    //   reportType,
    //   startDate,
    //   endDate
    // );

    const dateFilter = await getSalesReportData(startDate, endDate, reportType);

    console.log("here is the date filter===>", dateFilter);

    // Get orders data
    // {
    //   orderDate: { $gte: start, $lte: end },
    // }
    const orders = await Order.find(dateFilter)
      .populate("userId", "firstName lastName")
      .sort({ Date: -1 });

    console.log(orders);

    // Process data for report
    const reportData = orders.map((order) => ({
      orderId: order.orderId,
      //date: order.orderDate.toLocaleDateString(),
      date: order.Date.toLocaleDateString(),
      // date: order.Date ? order.Date : "N/A",

      customerName: order.userId?.firstName + ' ' + order.userId?.lastName || "Unknown",
      status: order.orderItems[0]?.orderStatus || "Processing",
      revenue: order.finalAmount || 0,
      orders: 1,
      productsSold: order.orderItems.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      ),
    }));

    // Group data by date
    const groupedData = reportData.reduce((acc, curr) => {
      const date = curr.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          orderId: curr.orderId,
          customerName: curr.customerName,
          status: curr.status,
          orders: 0,
          revenue: 0,
          productsSold: 0,
        };
      }
      acc[date].orders += curr.orders;
      acc[date].revenue += curr.revenue;
      acc[date].productsSold += curr.productsSold;
      return acc;
    }, {});

    const finalReportData = Object.values(groupedData);

    // Generate report based on format
    if (reportFormat === "excel") {
      const workbook = await generateExcelReport(reportData, reportType);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=sales_report_${reportType}.xlsx`
      );
      await workbook.xlsx.write(res);
      res.end();
    } else if (reportFormat === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=sales_report_${reportType}.pdf`
      );

      const doc = generatePDFReport(finalReportData, reportType);
      doc.pipe(res);
      doc.end();
    }
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
};

// Helper Functions
const getDateRange = (reportType, startDate, endDate) => {
  const endDateTime = new Date();
  let startDateTime = new Date();

  switch (reportType) {
    case "daily":
      startDateTime.setDate(startDateTime.getDate() - 1);
      break;
    case "weekly":
      startDateTime.setDate(startDateTime.getDate() - 7);
      break;
    case "yearly":
      startDateTime.setFullYear(startDateTime.getFullYear() - 1);
      break;
    case "custom":
      if (startDate && endDate) {
        startDateTime = new Date(startDate);
        endDateTime.setTime(new Date(endDate).getTime() + 86399999); // End of day
      }
      break;
  }
  return { startDate: startDateTime, endDate: endDateTime };
};


// const getMonthlyData = async () => {
//   const sixMonthsAgo = new Date();
//   sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
//   console.log(sixMonthsAgo);

//   const monthNames = [
//     "Jan",
//     "Feb",
//     "Mar",
//     "Apr",
//     "May",
//     "Jun",
//     "Jul",
//     "Aug",
//     "Sep",
//     "Oct",
//     "Nov",
//     "Dec",
//   ];
//   // const monthlyData = await Order.aggregate([
//   //   { $match: { Date: { $gte: sixMonthsAgo } } },
//   //   // {
//   //   //   $group: {
//   //   //     _id: {
//   //   //       month: { $month: "$Date" },
//   //   //       year: { $year: "$Date" },
//   //   //     },
//   //   //     revenue: { $sum: "$finalAmount" },
//   //   //     orderCount: { $sum: 1 },
//   //   //   },
//   //   // },
//   //   // { $sort: { "_id.year": 1, "_id.month": 1 } },
//   // ]);

//   // console.log(monthlyData);

//   // const last6Months = [];
//   // for (let i = 0; i < 6; i++) {
//   //   const d = new Date();
//   //   d.setMonth(d.getMonth() - i);
//   //   last6Months.unshift({ month: d.getMonth() + 1, year: d.getFullYear() });
//   // }

//   // const revenueData = new Array(6).fill(0);
//   // const ordersData = new Array(6).fill(0);

//   // monthlyData.forEach((data) => {
//   //   const month = data._id.month;
//   //   const year = data._id.year;
//   //   const index = last6Months.findIndex(
//   //     (m) => m.month === month && m.year === year
//   //   );
//   //   if (index !== -1) {
//   //     revenueData[index] = monthlyData.revenue;
//   //     ordersData[index] = monthlyData.orderCount;
//   //   }
//   // });

//   // const chartLabels = last6Months.map((m) => monthNames[m.month - 1]);
//   // return { revenueData, ordersData, chartLabels };


//   const monthlyData = await Order.aggregate([
//     { $match: { Date: { $gte: sixMonthsAgo } } },
//     {
//       $group: {
//         _id: {
//           // month: { $month: "$Date" },
//           // year: { $year: "$Date" },
//           month: { $month: "$createdAt" },
//         year: { $year: "$createdAt" },
//         },
//         revenue: { $sum: "$finalAmount" },
//         orderCount: { $sum: 1 },
//       },
//     },
//     { $sort: { "_id.year": 1, "_id.month": 1 } },
//   ]);
//   console.log("Raw monthly data:", monthlyData); // Debug log
  
//   const last6Months = [];
//   for (let i = 0; i < 6; i++) {
//     const d = new Date();
//     d.setMonth(d.getMonth() - i);
//     last6Months.unshift({ month: d.getMonth() + 1, year: d.getFullYear() });
//   }

//   const revenueData = new Array(6).fill(0);
//   const ordersData = new Array(6).fill(0);
//   monthlyData.forEach((data) => {
//     const index = last6Months.findIndex(
//       (m) => m.month === data._id.month && m.year === data._id.year
//     );
//     if (index !== -1) {
//       revenueData[index] = data.revenue ||  0 ;
//       ordersData[index] = data.orderCount ||  0 ;
//     }
//   });
//   const chartLabels = last6Months.map((m) => monthNames[m.month - 1]);


// };


const getMonthlyData = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  console.log(sixMonthsAgo);

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthlyData = await Order.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } }, // Use createdAt instead of Date
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        revenue: { $sum: "$finalAmount" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);
  console.log("Raw monthly data:", monthlyData); // Debug log

  const last6Months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    last6Months.unshift({ month: d.getMonth() + 1, year: d.getFullYear() });
  }

  const revenueData = new Array(6).fill(0);
  const ordersData = new Array(6).fill(0);
  monthlyData.forEach((data) => {
    const index = last6Months.findIndex(
      (m) => m.month === data._id.month && m.year === data._id.year
    );
    if (index !== -1) {
      revenueData[index] = data.revenue || 0;
      ordersData[index] = data.orderCount || 0;
    }
  });
  const chartLabels = last6Months.map((m) => monthNames[m.month - 1]);

  // Return the data
  return { revenueData, ordersData, chartLabels };
};

const getTopProductsData = async () => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalQuantity: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $match: { "productInfo.0": { $exists: true } } },
    ]);

    if (topProducts.length > 0) {
      return {
        productLabels: topProducts.map(
          (p) => p.productInfo[0]?.productName || "Unknown Product"
        ),
        productData: topProducts.map((p) => p.totalQuantity),
      };
    }
    return {
      productLabels: ["No Products"],
      productData: [100],
    };
  } catch (err) {
    console.error("Error fetching top products:", err);
    return {
      productLabels: ["Error"],
      productData: [100],
    };
  }
};

// File: dashboardController.js
// Add these functions after getTopProductsData

const getTopCategoriesData = async () => {
  try {
    const topCategories = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $lookup: {
          from: "categories",
          localField: "productInfo.category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      {
        $group: {
          _id: "$categoryInfo._id",
          categoryName: { $first: "$categoryInfo.name" },
          count: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return {
      categoryLabels: topCategories.map((c) => c.categoryName || "Unknown"),
      categoryData: topCategories.map((c) => c.count),
    };
  } catch (err) {
    console.error("Error fetching top categories:", err);
    return {
      categoryLabels: ["No Data"],
      categoryData: [100],
    };
  }
};

const getTopBrandsData = async () => {
  try {
    const topBrands = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.brand",
          count: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 4 },
    ]);

    return {
      brandLabels: topBrands.map((b) => b._id || "Unknown"),
      brandData: topBrands.map((b) => b.count),
    };
  } catch (err) {
    console.error("Error fetching top brands:", err);
    return {
      brandLabels: ["No Data"],
      brandData: [100],
    };
  }
};

const generateExcelReport = async (data, reportType) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Report");

  worksheet.addRow(["Order ID", "Date", "Customer", "Status", "Amount"]);
  data.forEach((row) => {
    worksheet.addRow([
      row.orderId,
      row.date,
      row.customerName,
      row.status,
      row.revenue,
    ]);
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach((column) => {
    column.width = 20;
  });

  return workbook;
};

const generatePDFReport = (data, reportType) => {
  const doc = new PDFDocument();

  doc.fontSize(20).text("Sales Report", { align: "center" });
  doc.fontSize(12).moveDown();
  doc.text(
    `Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`,
    {
      align: "center",
    }
  );
  doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, {
    align: "center",
  });

  const periodStart = data[0]?.date || "";
  const periodEnd = data[data.length - 1]?.date || "";
  doc.text(`Period: ${periodStart} to ${periodEnd}`, { align: "center" });

  doc.moveDown();
  doc.text("Summary:", { align: "center" });
  const totalOrders = data.reduce((sum, row) => sum + row.orders, 0);
  const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
  doc.text(`Total Orders: ${totalOrders}`, { align: "center" });
  doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString("en-IN")}`, {
    align: "center",
  });

  const tableTop = 250;
  doc.fontSize(12).text("Order ID", 50, tableTop);
  doc.text("Date", 200, tableTop);
  doc.text("Customer", 300, tableTop);
  doc.text("Status", 400, tableTop);
  doc.text("Amount", 500, tableTop);

  doc
    .lineWidth(1)
    .moveTo(50, tableTop + 20)
    .lineTo(600, tableTop + 20)
    .stroke();

  let yPosition = tableTop + 40;
  data.forEach((row) => {
    doc.fontSize(10);
    doc.text(row.orderId || "", 50, yPosition, { width: 150 });
    doc.text(row.date || "", 200, yPosition, { width: 100 });
    doc.text(row.customerName || "Unknown", 300, yPosition, { width: 100 });
    doc.text(row.status || "", 400, yPosition, { width: 100 });
    doc.text(`₹${row.revenue.toLocaleString("en-IN")}`, 500, yPosition, {
      width: 100,
    });

    yPosition += 30;
    doc
      .lineWidth(0.5)
      .moveTo(50, yPosition - 5)
      .lineTo(600, yPosition - 5)
      .stroke();
  });

  return doc;
};
// File: dashboardController.js
// Add these new controller functions

// const getChartData = async (req, res) => {
//   try {
//     const { timeRange } = req.query;
//     let startDate = new Date();
//     const endDate = new Date();

//     // Set date range based on requested time range
//     switch (timeRange) {
//       case "last-7-days":
//         startDate.setDate(startDate.getDate() - 7);
//         break;
//       case "last-30-days":
//         startDate.setDate(startDate.getDate() - 30);
//         break;
//       case "last-3-months":
//         startDate.setMonth(startDate.getMonth() - 3);
//         break;
//       case "yearly":
//         startDate.setFullYear(startDate.getFullYear() - 1);
//         break;
//       default:
//         startDate.setFullYear(startDate.getFullYear() - 1);
//     }

//     // Get filtered orders
//     const orders = await Order.find({
//     //   orderDate: { $gte: startDate, $lte: endDate },
//     // });
//     Date: { $gte: startDate, $lte: endDate },  // Changed from orderDate to Date
//     });

//     // Process data based on time range
//     let chartLabels = [];
//     let revenueData = [];
//     let ordersData = [];

//     if (timeRange === "last-7-days") {
//       // Daily data for last 7 days
//       for (let i = 6; i >= 0; i--) {
//         const date = new Date();
//         date.setDate(date.getDate() - i);
//         const dateStr = date.toLocaleDateString("en-US", { weekday: "short" });
//         chartLabels.push(dateStr);

//         const dayOrders = orders.filter((order) => {
//           const orderDate = new Date(order.orderDate);
//           return (
//             orderDate.getDate() === date.getDate() &&
//             orderDate.getMonth() === date.getMonth() &&
//             orderDate.getFullYear() === date.getFullYear()
//           );
//         });

//         const dayRevenue = dayOrders.reduce(
//           (sum, order) => sum + order.finalAmount,
//           0
//         );
//         revenueData.push(dayRevenue);
//         ordersData.push(dayOrders.length);
//       }
//     } else if (timeRange === "last-30-days" || timeRange === "last-3-months") {
//       // Weekly data
//       const weeks = timeRange === "last-30-days" ? 4 : 12;
//       for (let i = weeks - 1; i >= 0; i--) {
//         const endWeek = new Date();
//         endWeek.setDate(endWeek.getDate() - i * 7);
//         const startWeek = new Date(endWeek);
//         startWeek.setDate(startWeek.getDate() - 6);

//         const weekLabel = `${startWeek.getDate()}/${startWeek.getMonth() + 1} - ${endWeek.getDate()}/${endWeek.getMonth() + 1}`;
//         chartLabels.push(weekLabel);

//         const weekOrders = orders.filter((order) => {
//           const orderDate = new Date(order.orderDate);
//           return orderDate >= startWeek && orderDate <= endWeek;
//         });

//         const weekRevenue = weekOrders.reduce(
//           (sum, order) => sum + order.finalAmount,
//           0
//         );
//         revenueData.push(weekRevenue);
//         ordersData.push(weekOrders.length);
//       }
//     } else {
//       // Monthly data for yearly view
//       const monthNames = [
//         "Jan",
//         "Feb",
//         "Mar",
//         "Apr",
//         "May",
//         "Jun",
//         "Jul",
//         "Aug",
//         "Sep",
//         "Oct",
//         "Nov",
//         "Dec",
//       ];
//       for (let i = 11; i >= 0; i--) {
//         const month = new Date().getMonth() - i;
//         const year = new Date().getFullYear() + Math.floor(month / 12);
//         const adjustedMonth = ((month % 12) + 12) % 12;

//         chartLabels.push(monthNames[adjustedMonth]);

//         const monthOrders = orders.filter((order) => {
//           const orderDate = new Date(order.orderDate);
//           return (
//             orderDate.getMonth() === adjustedMonth &&
//             orderDate.getFullYear() === year
//           );
//         });

//         const monthRevenue = monthOrders.reduce(
//           (sum, order) => sum + order.finalAmount,
//           0
//         );
//         revenueData.push(monthRevenue);
//         ordersData.push(monthOrders.length);
//       }
//     }

//     res.json({ chartLabels, revenueData, ordersData });
//   } catch (error) {
//     console.error("Error fetching chart data:", error);
//     res.status(500).json({ error: "Failed to fetch chart data" });
//   }
// };

// const getCategoryData = async (req, res) => {
//   try {
//     const { timeRange } = req.query;
//     let startDate = new Date();
//     const endDate = new Date();

//     // Set date range based on requested time range
//     switch (timeRange) {
//       case "week":
//         startDate.setDate(startDate.getDate() - 7);
//         break;
//       case "month":
//         startDate.setMonth(startDate.getMonth() - 1);
//         break;
//       case "year":
//         startDate.setFullYear(startDate.getFullYear() - 1);
//         break;
//       default:
//         startDate.setFullYear(startDate.getFullYear() - 1);
//     }

//     // Get filtered categories data
//     const topCategories = await Order.aggregate([
//       //{ $match: { orderDate: { $gte: startDate, $lte: endDate } } },
//       { $match: { Date: { $gte: startDate, $lte: endDate } } },  // Changed from orderDate to Date
      
//       { $unwind: "$orderItems" },
//       {
//         $lookup: {
//           from: "products",
//           localField: "orderItems.product",
//           foreignField: "_id",
//           as: "productInfo",
//         },
//       },
//       { $unwind: "$productInfo" },
//       {
//         $lookup: {
//           from: "categories",
//           localField: "productInfo.category",
//           foreignField: "_id",
//           as: "categoryInfo",
//         },
//       },
//       { $unwind: "$categoryInfo" },
//       {
//         $group: {
//           _id: "$categoryInfo._id",
//           categoryName: { $first: "$categoryInfo.name" },
//           count: { $sum: "$orderItems.quantity" },
//         },
//       },
//       { $sort: { count: -1 } },
//       { $limit: 5 },
//     ]);

//     const labels = topCategories.map((c) => c.categoryName || "Unknown");
//     const data = topCategories.map((c) => c.count);

//     res.json({ labels, data });
//   } catch (error) {
//     console.error("Error fetching category data:", error);
//     res.status(500).json({ error: "Failed to fetch category data" });
//   }
// };

// const getBrandData = async (req, res) => {
//   try {
//     const { timeRange } = req.query;
//     let startDate = new Date();
//     const endDate = new Date();

//     // Set date range based on requested time range
//     switch (timeRange) {
//       case "week":
//         startDate.setDate(startDate.getDate() - 7);
//         break;
//       case "month":
//         startDate.setMonth(startDate.getMonth() - 1);
//         break;
//       case "year":
//         startDate.setFullYear(startDate.getFullYear() - 1);
//         break;
//       default:
//         startDate.setFullYear(startDate.getFullYear() - 1);
//     }

//     // Get filtered brands data
//     const topBrands = await Order.aggregate([
//       //{ $match: { orderDate: { $gte: startDate, $lte: endDate } } },
//       { $match: { Date: { $gte: startDate, $lte: endDate } } },  // Changed from orderDate to Date
//       { $unwind: "$orderItems" },
//       {
//         $lookup: {
//           from: "products",
//           localField: "orderItems.product",
//           foreignField: "_id",
//           as: "productInfo",
//         },
//       },
//       { $unwind: "$productInfo" },
//       {
//         $group: {
//           _id: "$productInfo.brand",
//           count: { $sum: "$orderItems.quantity" },
//         },
//       },
//       { $sort: { count: -1 } },
//       { $limit: 4 },
//     ]);

//     const labels = topBrands.map((b) => b._id || "Unknown");
//     const data = topBrands.map((b) => b.count);

//     res.json({ labels, data });
//   } catch (error) {
//     console.error("Error fetching brand data:", error);
//     res.status(500).json({ error: "Failed to fetch brand data" });
//   }
// };


// Modify getChartData to use createdAt and handle real-time updates
const getChartData = async (req, res) => {
  try {
    const { timeRange } = req.query;
    let startDate = new Date();
    const endDate = new Date();

    switch (timeRange) {
      case "last-7-days":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "last-30-days":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "last-3-months":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "yearly":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }, // Use createdAt from your schema
    });

    let chartLabels = [];
    let revenueData = [];
    let ordersData = [];

    if (timeRange === "last-7-days") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString("en-US", { weekday: "short" });
        chartLabels.push(dateStr);

        const dayOrders = orders.filter((order) =>
          new Date(order.createdAt).toDateString() === date.toDateString()
        );
        revenueData.push(
          dayOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0)
        );
        ordersData.push(dayOrders.length);
      }
    } else if (timeRange === "last-30-days" || timeRange === "last-3-months") {
      const weeks = timeRange === "last-30-days" ? 4 : 12;
      for (let i = weeks - 1; i >= 0; i--) {
        const endWeek = new Date();
        endWeek.setDate(endWeek.getDate() - i * 7);
        const startWeek = new Date(endWeek);
        startWeek.setDate(startWeek.getDate() - 6);

        const weekLabel = `${startWeek.getDate()}/${startWeek.getMonth() + 1}`;
        chartLabels.push(weekLabel);

        const weekOrders = orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startWeek && orderDate <= endWeek;
        });
        revenueData.push(
          weekOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0)
        );
        ordersData.push(weekOrders.length);
      }
    } else {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let i = 11; i >= 0; i--) {
        const month = new Date().getMonth() - i;
        const year = new Date().getFullYear() + Math.floor(month / 12);
        const adjustedMonth = ((month % 12) + 12) % 12;

        chartLabels.push(monthNames[adjustedMonth]);

        const monthOrders = orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate.getMonth() === adjustedMonth && orderDate.getFullYear() === year;
        });
        revenueData.push(
          monthOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0)
        );
        ordersData.push(monthOrders.length);
      }
    }

    res.json({ chartLabels, revenueData, ordersData });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: "Failed to fetch chart data" });
  }
};

// Ensure getCategoryData and getBrandData use createdAt as well
const getCategoryData = async (req, res) => {
  try {
    const { timeRange } = req.query;
    let startDate = new Date();
    const endDate = new Date();

    switch (timeRange) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const topCategories = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $lookup: {
          from: "categories",
          localField: "productInfo.category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      {
        $group: {
          _id: "$categoryInfo._id",
          categoryName: { $first: "$categoryInfo.name" },
          count: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const labels = topCategories.map((c) => c.categoryName || "Unknown");
    const data = topCategories.map((c) => c.count);

    res.json({ labels, data });
  } catch (error) {
    console.error("Error fetching category data:", error);
    res.status(500).json({ error: "Failed to fetch category data" });
  }
};

const getBrandData = async (req, res) => {
  try {
    const { timeRange } = req.query;
    let startDate = new Date();
    const endDate = new Date();

    switch (timeRange) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const topBrands = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $lookup: {
          from: "brands",
          localField: "productInfo.brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },
      {
        $group: {
          _id: "$brandInfo._id",
          brandName: { $first: "$brandInfo.brandName" },
          count: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 4 },
    ]);

    const labels = topBrands.map((b) => b.brandName || "Unknown");
    const data = topBrands.map((b) => b.count);

    res.json({ labels, data });
  } catch (error) {
    console.error("Error fetching brand data:", error);
    res.status(500).json({ error: "Failed to fetch brand data" });
  }
};
module.exports = {
  loadDashboard,
  downloadReport,
  generateExcelReport, // Already exported but keeping for completeness
  generatePDFReport, // Already exported but keeping for completeness
  getChartData,
  getCategoryData,
  getBrandData,
  getTopCategoriesData,
  getTopBrandsData,
  getTopProductsData, // Missing from exports
  getMonthlyData, // Missing from exports
  getDateRange, // Missing from exports
};
