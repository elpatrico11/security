const ActivityLog = require("../models/ActivityLog");

const logActivity = async (username, action, description, status = {}) => {
  try {
    const log = new ActivityLog({
      username,
      action,
      description,
      status,
    });
    await log.save();
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

module.exports = { logActivity };
