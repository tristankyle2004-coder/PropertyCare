// Represents maintenance tickets; status and priority are enum fields.
// models/maintenanceRequest.js
// Maintenance request model.
// Stores work orders and their status/priority.

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "MaintenanceRequest",
    {
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      category: { type: DataTypes.STRING, allowNull: true },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high"),
        defaultValue: "medium"
      },
      status: {
        type: DataTypes.ENUM("open", "assigned", "in_progress", "completed", "closed"),
        defaultValue: "open"
      }
    },
    { tableName: "maintenance_requests" }
  );
};
