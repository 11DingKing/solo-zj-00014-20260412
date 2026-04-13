const db = require("../models");
const Tag = db.tags;
const Tutorial = db.tutorials;
const Op = db.Sequelize.Op;

exports.create = (req, res) => {
  if (!req.body.name) {
    res.status(400).send({
      message: "Name can not be empty!"
    });
    return;
  }

  const tag = {
    name: req.body.name,
    color: req.body.color || "#000000"
  };

  Tag.create(tag)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      if (err.name === "SequelizeUniqueConstraintError") {
        res.status(400).send({
          message: "Tag name already exists!"
        });
      } else {
        res.status(500).send({
          message:
            err.message || "Some error occurred while creating the Tag."
        });
      }
    });
};

exports.findAll = (req, res) => {
  Tag.findAll({
    attributes: {
      include: [
        [
          db.sequelize.literal(`(
            SELECT COUNT(*) FROM tutorial_tags 
            WHERE tutorial_tags.tagId = tag.id
          )`),
          "tutorialCount"
        ]
      ]
    }
  })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving tags."
      });
    });
};

exports.setTagsForTutorial = (req, res) => {
  const tutorialId = req.params.id;
  const tagIds = req.body.tagIds || [];

  if (!Array.isArray(tagIds)) {
    res.status(400).send({
      message: "tagIds must be an array!"
    });
    return;
  }

  Tutorial.findByPk(tutorialId)
    .then(tutorial => {
      if (!tutorial) {
        res.status(404).send({
          message: `Cannot find Tutorial with id=${tutorialId}.`
        });
        return;
      }

      if (tagIds.length === 0) {
        return tutorial.setTags([]).then(() => {
          res.send({ message: "Tags cleared successfully." });
        });
      }

      return Tag.findAll({
        where: {
          id: {
            [Op.in]: tagIds
          }
        }
      }).then(tags => {
        if (tags.length !== tagIds.length) {
          res.status(400).send({
            message: "Some tag IDs are invalid."
          });
          return;
        }

        return tutorial.setTags(tags).then(() => {
          res.send({ message: "Tags set successfully." });
        });
      });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error setting tags for Tutorial with id=" + tutorialId
      });
    });
};
