require("dotenv").config();

const authMiddleware = (req, res, next) => {
  const apiKey = process.env.DOCKWATCH_API_KEY || "dockwatch";
  const providedKey = req.headers["x-api-key"] || req.query.apikey;

  if (!providedKey || providedKey !== apiKey) {
    return res.status(401).json({
      code: 401,
      error: "Invalid apikey",
    });
  }
  next();
};

module.exports = authMiddleware;
