// models/index.js
// Sequelize setup and model associations.
// Uses SQLite in-memory DB for tests and MySQL for real app use.

const { Sequelize } = require("sequelize");

let sequelize;

if (process.env.NODE_ENV === "test") {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: "mysql",
      logging: false,
      dialectOptions: { multipleStatements: true }
    }
  );
}

// ---------------------------
// Import models
// ---------------------------
const User = require("../../user")(sequelize);
const Property = require("../../property")(sequelize);
const MaintenanceRequest = require("../../maintenanceRequest")(sequelize);
const Photo = require("./photo")(sequelize);

// ---------------------------
// Define associations
// ---------------------------
User.hasMany(Property, { foreignKey: "ownerId" });
Property.belongsTo(User, { foreignKey: "ownerId" });

Property.hasMany(MaintenanceRequest, { foreignKey: "propertyId" });
MaintenanceRequest.belongsTo(Property, { foreignKey: "propertyId" });

User.hasMany(MaintenanceRequest, { foreignKey: "tenantId" });
MaintenanceRequest.belongsTo(User, { foreignKey: "tenantId", as: "tenant" });

User.hasMany(MaintenanceRequest, { foreignKey: "assignedWorkerId" });
MaintenanceRequest.belongsTo(User, { foreignKey: "assignedWorkerId", as: "worker" });

MaintenanceRequest.hasMany(Photo, { foreignKey: "requestId" });
Photo.belongsTo(MaintenanceRequest, { foreignKey: "requestId" });

module.exports = {
  sequelize,
  User,
  Property,
  MaintenanceRequest,
  Photo
};
