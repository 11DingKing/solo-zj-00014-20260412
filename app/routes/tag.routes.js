module.exports = app => {
  const tags = require("../controllers/tag.controller.js");

  var router = require("express").Router();

  router.post("/", tags.create);

  router.get("/", tags.findAll);

  app.use('/api/tags', router);
};
