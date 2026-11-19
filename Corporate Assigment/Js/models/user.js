// models/user.js
// User model.
// Stores account login details and role information.

const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM("tenant", "owner", "worker", "admin"),
        defaultValue: "tenant"
      },
      phone: { type: DataTypes.STRING, allowNull: true }
    },
    { tableName: "users" }
  );

  // Hash password before creating a user if it is still plain text
  User.beforeCreate(async (user) => {
    if (user.passwordHash && user.passwordHash.length < 60) {
      user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
    }
  });

  // Compare password against stored hash
  User.prototype.validatePassword = function (password) {
    return bcrypt.compare(password, this.passwordHash);
  };

  return User;
};