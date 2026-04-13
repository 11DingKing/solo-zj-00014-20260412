module.exports = (sequelize, Sequelize) => {
  const Tag = sequelize.define("tag", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    color: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "#000000"
    }
  });

  return Tag;
};
