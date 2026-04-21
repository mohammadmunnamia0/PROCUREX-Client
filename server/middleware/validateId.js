const mongoose = require("mongoose");

// Middleware to validate MongoDB ObjectId in route params
const validateId = (paramName = "id") => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    return res.status(400).json({ message: `Invalid ${paramName} format` });
  }
  next();
};

module.exports = validateId;
