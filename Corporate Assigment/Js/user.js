

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      // We store hashed password in passwordHash; when creating we accept plain text in the field name we pass
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM("tenant", "owner", "worker", "admin"),
        defaultValue: "tenant"
      },
      phone: { type: DataTypes.STRING, allowNull: true }
    },
    { tableName: "users" }
  );

  // Hook: beforeCreate - automatically hash short values (i.e., plain-text) for convenience in register flow
  User.beforeCreate(async (user) => {
    if (user.passwordHash && user.passwordHash.length < 60) {
      user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
    }
  });

  // Instance method to compare a candidate password with the stored hash
  User.prototype.validatePassword = function (password) {
    return bcrypt.compare(password, this.passwordHash);
  };

  return User;
};
