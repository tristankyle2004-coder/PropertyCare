// models/photo.js
// Photo model.
// Stores uploaded images related to a maintenance request.

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Photo",
    {
      imageUrl: { type: DataTypes.STRING, allowNull: false }
    },
    { tableName: "photos" }
  );
};
