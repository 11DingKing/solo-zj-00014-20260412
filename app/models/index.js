const dbConfig = require("../config/db.config.js");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: false,

  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.tutorials = require("./tutorial.model.js")(sequelize, Sequelize);
db.tags = require("./tag.model.js")(sequelize, Sequelize);

db.tutorials.belongsToMany(db.tags, {
  through: "tutorial_tags",
  as: "tags",
  foreignKey: "tutorialId"
});

db.tags.belongsToMany(db.tutorials, {
  through: "tutorial_tags",
  as: "tutorials",
  foreignKey: "tagId"
});

module.exports = db;
