const express = require('express');
const path = require('path');
const multer = require('multer');
const exphbs = require('express-handlebars');
const stripJs = require('strip-js');
const blogData = require('./blog-service.js');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const authData = require('./auth-service.js');
const clientSessions = require('client-sessions');
const {
  initialize,
  getCategories,
  getPostById,
  getPublishedPostsByCategory,
  addPost,
  getPostsByMinDate,
  addCategory,
  getAllPosts,
  deleteCategoryById,
  deletePostById,
} = require('./blog-service.js');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());
app.engine(
  '.hbs',
  exphbs.engine({
    extname: '.hbs',
    helpers: {
      navLink: function (url, options) {
        return (
          '<li' +
          (url == app.locals.activeRoute ? ' class="active" ' : '') +
          '><a href="' +
          url +
          '">' +
          options.fn(this) +
          '</a></li>'
        );
      },
      equal: function (left, right, options) {
        if (arguments.length < 3) throw new Error('error');
        if (left != right) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      },
      safeHTML: function (context) {
        return stripJs(context);
      },
      formatDate: function (dateObj) {
        let year = dateObj.getFullYear();
        let month = (dateObj.getMonth() + 1).toString();
        let day = dateObj.getDate().toString();
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      },
    },
  })
);

app.use(
  clientSessions({
    cookieName: 'session',
    secret: 'web322app',
    duration: 2 * 60 * 1000,
    activeDuration: 1000 * 60,
  })
);

app.use(function (req, res, next) {
  res.locals.session = req.session;
  next();
});

function ensureLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

app.get('/login', (req, res) => {
  res.render('login');
});
app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  authData
    .checkUser(req.body)
    .then((user) => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory,
      };
      res.redirect('/posts');
    })
    .catch((err) => {
      res.render('login', { errorMessage: err, userName: req.body.userName });
    });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  authData
    .registerUser(req.body)
    .then(() => {
      res.render('register', { successMessage: 'User created' });
    })
    .catch((err) => {
      res.render('register', {
        errorMessage: err,
        userName: req.body.userName,
      });
    });
});

app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory');
});

app.use(function (req, res, next) {
  let route = req.path.substring(1);
  app.locals.activeRoute =
    '/' +
    (isNaN(route.split('/')[1])
      ? route.replace(/\/(?!.*)/, '')
      : route.replace(/\/(.*)/, ''));
  app.locals.viewingCategory = req.query.category;
  next();
});

app.use(express.urlencoded({ extended: true }));

app.set('view engine', '.hbs');
cloudinary.config({
  cloud_name: 'dcjqjxn4z',
  api_key: '445571222236642',
  api_secret: 'jxBeU-GTUBpXECDVFv0qBltltSs',
  secure: true,
});

const upload = multer();
const HTTP_PORT = process.env.PORT || 8080;
app.get('/', (req, res) => {
  res.redirect('/blog');
});
app.get('/about', (req, res) => {
  res.render('about');
});
app.get('/posts', ensureLogin, (req, res) => {
  if (req.query.category) {
    getPublishedPostsByCategory(req.query.category)
      .then((data) => {
        data.length > 0
          ? res.render('posts', { posts: data })
          : res.render('posts', { message: 'No Results' });
      })
      .catch((err) => {
        res.render('posts', { message: 'no results' });
      });
  } else if (req.query.minDate) {
    getPostsByMinDate(req.query.minDate)
      .then((data) => {
        data.length > 0
          ? res.render('posts', { posts: data })
          : res.render('posts', { message: 'No Results' });
      })
      .catch((err) => {
        res.render('posts', { message: 'no results' });
      });
  } else {
    getAllPosts()
      .then((data) => {
        data.length > 0
          ? res.render('posts', { posts: data })
          : res.render('posts', { message: 'No Results' });
      })
      .catch((err) => {
        res.render('posts', { message: 'no results' });
      });
  }
});

app.get('/blog', async (req, res) => {
  let viewData = {};
  try {
    let posts = [];
    if (req.query.category) {
      posts = await blogData.getPublishedPostsByCategory(req.query.category);
    } else {
      posts = await blogData.getPublishedPosts();
    }
    posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
    let post = posts[0];
    viewData.posts = posts;
    viewData.post = post;
  } catch (err) {
    viewData.message = 'no result';
  }
  try {
    let categories = await blogData.getCategories();
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = 'no result';
  }
  if (viewData.posts.length > 0) {
    res.render('blog', { data: viewData });
  } else {
    res.render('blog', {
      data: viewData,
      message: 'Try another post',
    });
  }
});

app.get('/posts/add', ensureLogin, (req, res) => {
  getCategories()
    .then((categories) => {
      res.render('addPost', { categories: categories });
    })
    .catch(() => {
      res.render('addPost', { categories: [] });
    });
});

app.get('/categories', ensureLogin, (req, res) => {
  getCategories()
    .then((data) => {
      data.length > 0
        ? res.render('categories', { categories: data })
        : res.render('categories', { message: 'No Results' });
    })
    .catch(() => {
      res.render('categories', { message: 'no results' });
    });
});

app.post(
  '/posts/add',
  ensureLogin,
  upload.single('featureImage'),
  (req, res) => {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };
    async function upload(req) {
      let result = await streamUpload(req);
      return result;
    }

    upload(req)
      .then((uploaded) => {
        req.body.featureImage = uploaded.url;
        let postObject = {};
        postObject.body = req.body.body;
        postObject.title = req.body.title;
        postObject.postDate = new Date().toISOString().slice(0, 10);
        postObject.category = req.body.category;
        postObject.featureImage = req.body.featureImage;
        postObject.published = req.body.published;
        if (postObject.title) {
          addPost(postObject).then(() => {
            res.redirect('/posts');
          });
        }
      })
      .catch((err) => {
        res.send(err);
      });
  }
);

app.get('/post/:value', (req, res) => {
  getPostById(req.params.value)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.send(err);
    });
});

app.get('/blog/:id', ensureLogin, async (req, res) => {
  let viewData = {};
  try {
    let posts = [];
    if (req.query.category) {
      posts = await blogData.getPublishedPostsByCategory(req.query.category);
    } else {
      posts = await blogData.getPublishedPosts();
    }
    posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
    viewData.posts = posts;
  } catch (err) {
    viewData.message = 'no results';
  }
  try {
    viewData.post = await blogData.getPostById(req.params.id);
  } catch (err) {
    viewData.message = 'no results';
  }
  try {
    let categories = await blogData.getCategories();
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = 'no results';
  }
  res.render('blog', { data: viewData });
});

app.get('/categories/add', ensureLogin, (req, res) => {
  res.render('addCategory');
});

app.post('/categories/add', ensureLogin, (req, res) => {
  let cat = {};
  cat.category = req.body.category;
  if (req.body.category != '') {
    addCategory(cat)
      .then(() => {
        res.redirect('/categories');
      })
      .catch(() => {
        console.log('Error!');
      });
  }
});

app.get('/categories/delete/:id', ensureLogin, (req, res) => {
  deleteCategoryById(req.params.id)
    .then(() => {
      res.redirect('/categories');
    })
    .catch(() => {
      console.log('Unable to remove');
    });
});

app.get('/posts/delete/:id', ensureLogin, (req, res) => {
  deletePostById(req.params.id)
    .then(() => {
      res.redirect('/posts');
    })
    .catch(() => {
      console.log('Unable to remove');
    });
});

app.use((req, res) => {
  res.status(404).render('404');
});

blogData
  .initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(HTTP_PORT, function () {
      console.log('app listening on: ' + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log('unable to start server: ' + err);
  });
