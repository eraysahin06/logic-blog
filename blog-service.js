const Sequelize = require('sequelize');
const pg = require('pg');

var sequelize = new Sequelize(
  'kcqnoykz',
  'kcqnoykz',
  'y-C56NXfCfQIxv9U51oF2FPQMsJWAg0P',
  {
    host: 'ruby.db.elephantsql.com',
    dialect: 'postgres',
    dialectModule: pg,
    port: 5432,
    dialectOptions: {
      ssl: { rejectUnauthorized: false },
    },
    query: { raw: true },
  }
);

const Post = sequelize.define('Post', {
  body: Sequelize.TEXT,
  title: Sequelize.STRING,
  postDate: Sequelize.DATE,
  featureImage: Sequelize.STRING,
  published: Sequelize.BOOLEAN,
});

const Category = sequelize.define('Category', {
  category: Sequelize.STRING,
});

Post.belongsTo(Category, { foreignKey: 'category' });

function initialize() {
  return new Promise((resolve, reject) => {
    sequelize
      .sync()
      .then(() => {
        resolve();
      })
      .catch(() => {
        reject('Cannot sync');
      });
  });
}

function getAllPosts() {
  return new Promise((resolve, reject) => {
    Post.findAll()
      .then((data) => {
        resolve(data);
      })
      .catch(() => {
        reject('No results');
      });
  });
}

function getPublishedPosts() {
  return new Promise((resolve, reject) => {
    Post.findAll({
      where: {
        published: true,
      },
    })
      .then((data) => {
        resolve(data);
      })
      .catch(() => {
        reject('No results');
      });
  });
}

function getCategories() {
  return new Promise((resolve, reject) => {
    Category.findAll()
      .then((data) => {
        resolve(data);
      })
      .catch(() => {
        reject('No results');
      });
  });
}

function getPostsByCategory(category) {
  return new Promise((resolve, reject) => {
    Post.findAll({
      where: {
        category: category,
      },
    })
      .then((data) => {
        console.log(category);
        resolve(data);
      })
      .catch(() => {
        reject('No results');
      });
  });
}

function getPublishedPostsByCategory(category) {
  return new Promise((resolve, reject) => {
    Post.findAll({
      where: {
        category: category,
        published: true,
      },
    })
      .then((data) => {
        resolve(data);
      })
      .catch(() => {
        reject('No results');
      });
  });
}

function addPost(postData) {
  return new Promise((resolve, reject) => {
    postData.published = postData.published ? true : false;
    for (const i in postData) {
      if (postData[i] === '') {
        postData[i] = null;
      }
    }
    postData.postDate = new Date();
    Post.create(postData)
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject('Unable to create');
      });
  });
}

function addCategory(categoryData) {
  return new Promise((resolve, reject) => {
    for (let i in categoryData) {
      if (categoryData[i] === '') {
        categoryData[i] = null;
      }
    }
    Category.create(categoryData)
      .then((category) => {
        resolve(category);
      })
      .catch(() => {
        reject('Unable to create');
      });
  });
}

function deletePostById(id) {
  return new Promise((resolve, reject) => {
    Post.destroy({
      where: {
        id: id,
      },
    })
      .then(() => {
        resolve('done');
      })
      .catch(() => {
        reject('Unable to delete');
      });
  });
}

function getPostById(id) {
  return new Promise((resolve, reject) => {
    Post.findAll({
      where: {
        id: id,
      },
    })
      .then((data) => {
        resolve(data[0]);
      })
      .catch(() => {
        reject('No results');
      });
  });
}

function getPostsByMinDate(minDate) {
  return new Promise((resolve, reject) => {
    Post.findAll({
      where: {
        postDate: {
          [gte]: new Date(minDateStr),
        },
      },
    })
      .then((data) => {
        resolve(data);
      })
      .catch(() => {
        reject('No results');
      });
  });
}

function deleteCategoryById(id) {
  return new Promise((resolve, reject) => {
    Category.destroy({
      where: {
        id: id,
      },
    })
      .then(() => {
        resolve('done');
      })
      .catch(() => {
        reject('Unable to delete');
      });
  });
}

module.exports = {
  initialize,
  getPublishedPostsByCategory,
  getPostsByCategory,
  addCategory,
  deleteCategoryById,
  getAllPosts,
  getPublishedPosts,
  getCategories,
  addPost,
  getPostsByMinDate,
  getPostById,
  deletePostById,
};
