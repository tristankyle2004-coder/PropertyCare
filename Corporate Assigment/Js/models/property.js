// models/property.js
// Property model.
// Represents a property or unit owned by a user.

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Property",
    {
      name: { type: DataTypes.STRING, allowNull: false },
      address: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: "properties" }
  );
};
