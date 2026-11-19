// ======================================================
// SQLITE DATABASE AND MODEL SETUP
// ======================================================

const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");

// Keep the database file in the project folder.
// Set DB_STORAGE in .env to use a different file location.
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: process.env.DB_STORAGE || path.join(__dirname, "..", "maintenance.sqlite"),
  logging: false
});

// ======================================================
// LOAD THE MODEL DEFINITIONS
// These files must be inside the models folder.
// ======================================================

const User = require("./user")(sequelize);
const Property = require("./property")(sequelize);
const MaintenanceRequest = require("./maintenanceRequest")(sequelize);

// Define Photo here so this setup doesn't depend on a separate photo.js file.
const Photo = sequelize.define(
  "Photo",
  {
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    tableName: "photos"
  }
);

// ======================================================
// MODEL RELATIONSHIPS
// ======================================================

User.hasMany(Property, { foreignKey: "ownerId" });
Property.belongsTo(User, { foreignKey: "ownerId" });

Property.hasMany(MaintenanceRequest, { foreignKey: "propertyId" });
MaintenanceRequest.belongsTo(Property, { foreignKey: "propertyId" });

User.hasMany(MaintenanceRequest, { foreignKey: "tenantId" });
MaintenanceRequest.belongsTo(User, {
  foreignKey: "tenantId",
  as: "tenant"
});

User.hasMany(MaintenanceRequest, { foreignKey: "assignedWorkerId" });
MaintenanceRequest.belongsTo(User, {
  foreignKey: "assignedWorkerId",
  as: "worker"
});

MaintenanceRequest.hasMany(Photo, { foreignKey: "requestId" });
Photo.belongsTo(MaintenanceRequest, { foreignKey: "requestId" });

// ======================================================
// EXPORT THE DATABASE CONNECTION AND MODELS
// ======================================================

module.exports = {
  sequelize,
  User,
  Property,
  MaintenanceRequest,
  Photo
};