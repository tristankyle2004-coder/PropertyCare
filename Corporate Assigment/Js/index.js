// ======================================================
// PROPERTYCARE DATABASE SETUP
// Connects Sequelize to SQLite, loads the models,
// and defines the relationships between database tables.
// ======================================================

const path = require("path");
const { Sequelize } = require("sequelize");

// ======================================================
// 1. CONNECT TO THE DATABASE
// Tests use a temporary in-memory database.
// Normal app use creates/opens database.sqlite.
// ======================================================

const isTest = process.env.NODE_ENV === "test";

const sequelize = isTest
  ? new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false
    })
  : new Sequelize({
      dialect: "sqlite",
      storage: process.env.DB_STORAGE
        ? path.resolve(process.env.DB_STORAGE)
        : path.join(__dirname, "..", "database.sqlite"),
      logging: false
    });

// ======================================================
// 2. LOAD THE DATABASE MODELS
// Each model describes a table in the database.
// ======================================================

const User = require("./user")(sequelize);
const Property = require("./property")(sequelize);
const MaintenanceRequest = require("./maintenanceRequest")(sequelize);
const Photo = require("./photo")(sequelize);

// ======================================================
// 3. DEFINE TABLE RELATIONSHIPS
// These relationships let Sequelize connect related records.
// ======================================================

// A user can own multiple properties.
User.hasMany(Property, { foreignKey: "ownerId" });
Property.belongsTo(User, { foreignKey: "ownerId" });

// A property can have multiple maintenance requests.
Property.hasMany(MaintenanceRequest, { foreignKey: "propertyId" });
MaintenanceRequest.belongsTo(Property, { foreignKey: "propertyId" });

// A user can submit multiple maintenance requests as a tenant.
User.hasMany(MaintenanceRequest, { foreignKey: "tenantId" });
MaintenanceRequest.belongsTo(User, {
  foreignKey: "tenantId",
  as: "tenant"
});

// A worker can be assigned multiple maintenance requests.
User.hasMany(MaintenanceRequest, { foreignKey: "assignedWorkerId" });
MaintenanceRequest.belongsTo(User, {
  foreignKey: "assignedWorkerId",
  as: "worker"
});

// A maintenance request can have multiple photos.
MaintenanceRequest.hasMany(Photo, { foreignKey: "requestId" });
Photo.belongsTo(MaintenanceRequest, { foreignKey: "requestId" });

// ======================================================
// 4. EXPORT THE DATABASE AND MODELS
// Other files use these to read and update database records.
// ======================================================

module.exports = {
  sequelize,
  User,
  Property,
  MaintenanceRequest,
  Photo
};