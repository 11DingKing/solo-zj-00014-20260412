const db = require("../models");
const Tutorial = db.tutorials;
const Tag = db.tags;
const Op = db.Sequelize.Op;

exports.create = (req, res) => {
  if (!req.body.title) {
    res.status(400).send({
      message: "Content can not be empty!"
    });
    return;
  }

  const tutorial = {
    title: req.body.title,
    description: req.body.description,
    published: req.body.published ? req.body.published : false
  };

  Tutorial.create(tutorial)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the Tutorial."
      });
    });
};

exports.findAll = (req, res) => {
  const title = req.query.title;
  const published = req.query.published;
  const tagsParam = req.query.tags;

  var condition = {};

  if (title) {
    condition.title = { [Op.like]: `%${title}%` };
  }

  if (published !== undefined) {
    condition.published = published === 'true';
  }

  var includeOptions = [];

  if (tagsParam) {
    const tagIds = tagsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (tagIds.length > 0) {
      includeOptions.push({
        model: Tag,
        as: "tags",
        where: {
          id: {
            [Op.in]: tagIds
          }
        },
        through: { attributes: [] },
        required: true
      });
    }
  }

  Tutorial.findAll({ 
    where: Object.keys(condition).length > 0 ? condition : null,
    include: includeOptions.length > 0 ? includeOptions : undefined,
    distinct: true
  })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving tutorials."
      });
    });
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Tutorial.findByPk(id, {
    include: [{
      model: Tag,
      as: "tags",
      through: { attributes: [] }
    }]
  })
    .then(data => {
      if (data) {
        res.send(data);
      } else {
        res.status(404).send({
          message: `Cannot find Tutorial with id=${id}.`
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Error retrieving Tutorial with id=" + id
      });
    });
};

exports.update = (req, res) => {
  const id = req.params.id;

  Tutorial.update(req.body, {
    where: { id: id }
  })
    .then(num => {
      if (num == 1) {
        res.send({
          message: "Tutorial was updated successfully."
        });
      } else {
        res.send({
          message: `Cannot update Tutorial with id=${id}. Maybe Tutorial was not found or req.body is empty!`
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating Tutorial with id=" + id
      });
    });
};

exports.delete = (req, res) => {
  const id = req.params.id;

  Tutorial.destroy({
    where: { id: id }
  })
    .then(num => {
      if (num == 1) {
        res.send({
          message: "Tutorial was deleted successfully!"
        });
      } else {
        res.send({
          message: `Cannot delete Tutorial with id=${id}. Maybe Tutorial was not found!`
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete Tutorial with id=" + id
      });
    });
};

exports.deleteAll = (req, res) => {
  Tutorial.destroy({
    where: {},
    truncate: false
  })
    .then(nums => {
      res.send({ message: `${nums} Tutorials were deleted successfully!` });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all tutorials."
      });
    });
};

exports.findAllPublished = (req, res) => {
  Tutorial.findAll({ where: { published: true } })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving tutorials."
      });
    });
};

exports.setTags = (req, res) => {
  const id = req.params.id;
  const tagIds = req.body.tagIds || [];

  if (!Array.isArray(tagIds)) {
    res.status(400).send({
      message: "tagIds must be an array!"
    });
    return;
  }

  Tutorial.findByPk(id)
    .then(tutorial => {
      if (!tutorial) {
        res.status(404).send({
          message: `Cannot find Tutorial with id=${id}.`
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
        message: "Error setting tags for Tutorial with id=" + id
      });
    });
};

exports.batch = (req, res) => {
  const { action, ids, published } = req.body;

  if (!ids || !Array.isArray(ids)) {
    res.status(400).send({
      message: "ids must be an array!"
    });
    return;
  }

  if (ids.length > 100) {
    res.status(400).send({
      message: "Maximum 100 IDs allowed per batch operation."
    });
    return;
  }

  if (ids.length === 0) {
    res.status(400).send({
      message: "ids array cannot be empty."
    });
    return;
  }

  if (action !== "delete" && action !== "updatePublished") {
    res.status(400).send({
      message: "Invalid action. Must be 'delete' or 'updatePublished'."
    });
    return;
  }

  if (action === "updatePublished" && published === undefined) {
    res.status(400).send({
      message: "published field is required for updatePublished action."
    });
    return;
  }

  const t = db.sequelize.transaction();

  t.then(transaction => {
    if (action === "delete") {
      return Tutorial.destroy({
        where: { id: { [Op.in]: ids } },
        transaction
      }).then(() => {
        return transaction.commit();
      }).catch(err => {
        return transaction.rollback().then(() => {
          throw err;
        });
      });
    } else {
      return Tutorial.update(
        { published: published },
        { 
          where: { id: { [Op.in]: ids } },
          transaction
        }
      ).then(() => {
        return transaction.commit();
      }).catch(err => {
        return transaction.rollback().then(() => {
          throw err;
        });
      });
    }
  }).then(() => {
    if (action === "delete") {
      res.send({ message: `${ids.length} tutorials deleted successfully.` });
    } else {
      res.send({ message: `${ids.length} tutorials updated successfully.` });
    }
  }).catch(err => {
    res.status(500).send({
      message: err.message || "Some error occurred during batch operation."
    });
  });
};
