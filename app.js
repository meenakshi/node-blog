
// require dependant modules
var express = require('express'),
  mongoose = require('mongoose'),
  models = require('./models'),
  stylus = require('stylus'),
  mongostore = require('connect-mongodb'),
  sys = require('sys'),
  fs = require('fs'),
  crypto = require('crypto'),
  db,
  BlogPost,
  User,
  LoginToken;

// create server object
var app = module.exports = express.createServer();

//set helper libraries
app.helpers(require('./helpers.js').helpers);
app.dynamicHelpers(require('./helpers.js').dynamicHelpers);

function compile(str, path, fn) {
  stylus(str)
    .set('filename', path)
    .set('compress', true)
    .render(fn);
}

//configure environment
app.configure('development', function(){
  app.set('connstring', 'mongodb://localhost/schaermu-blog-dev');
  app.set('port', 3000);
  //app.set('disableAuthentication', true);
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('test', function() {
  app.set('port', 80);
  app.set('db-uri', 'mongodb://localhost/schaermu-blog-test');
});

app.configure('production', function(){
  app.set('port', 80);
  app.set('connstring', 'mongodb://localhost/schaermu-blog');
  app.use(express.errorHandler()); 
});

// configure server instance
app.configure(function(){
  app.set('views', __dirname + '/views');
  // set jade as default view engine
  app.set('view engine', 'jade');
  // set stylus as css compile engine
  app.use(stylus.middleware(
    { src: __dirname + '/stylus', dest: __dirname + '/public', compile: compile }
  ));
  app.use(express.bodyDecoder());
  app.use(express.cookieDecoder());
  app.use(express.session({ store: mongostore(app.set('connstring')), secret: 'topsecret' }));
  app.use(express.methodOverride());
  app.use(app.router);
  // use express logger
  app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }));
  app.use(express.staticProvider(__dirname + '/public'));
});

//configure models
models.defineModels(mongoose, function() {
  app.BlogPost = BlogPost = mongoose.model('BlogPost');
  app.User = User = mongoose.model('User');
  app.LoginToken = LoginToken = mongoose.model('LoginToken');
  db = mongoose.connect(app.set('connstring'));
});

//Error handling
function NotFound(msg) {
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}

sys.inherits(NotFound, Error);

app.error(function(err, req, res, next) {
  if (err instanceof NotFound) {
    res.render('404.jade', {
      locals: {
        status: 404
      }
    });
  } else {
    next(err);
  }
});

app.error(function(err, req, res) {
  res.render('500.jade', {
    locals: {
      status: 500,
      error: err
    }
  });
});

// authentication methods
function authFromLoginToken(req, res, next) {
  var cookie = JSON.parse(req.cookies.logintoken);
  LoginToken.findOne({ email: cookie.email, token: cookie.token, series: cookie.series }, function(err, token) {
    if (!token) {
      res.redirect('/login');
      return;
    }

    User.findOne({ email: token.email }, function(err, user) {
      if (user) {
        req.session.user_id = user.id;
        req.currentUser = user;
        
        token.token = token.randomToken();
        token.save(function(){
          res.cookie('logintoken', token.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
          next();
        });
      } else {
        res.redirect('/login');
      }
    });
  });
}

function loadUser(req, res, next) {
  if (app.set('disableAuthentication') === true)
    next();
  else {
    if (req.session.user_id) {
      User.findById(req.session.user_id, function(err, user) {
        if (user) {
          req.currentUser = user;
          next();
        } else {
          res.redirect('/login');
        }
      });
    } else if (req.cookies.logintoken) {
      authFromLoginToken(req, res, next);
    } else {
      res.redirect('/login');
    }
  }
}

/**
 * Login routes
 */
// render login form
app.get('/login', function(req, res) {
  res.render('login', {
    locals: { user: new User() }
  });
});

// login user
app.post('/login', function(req, res) {
  User.findOne({ email: req.body.user.email }, function(err, user) {
    if (user && user.authenticate(req.body.user.password)) {
      req.session.user_id = user.id;
      
      if (req.body.remember_me) {
        var loginToken = new LoginToken({ email: user.email });
        loginToken.save(function() {
          res.cookie('logintoken', loginToken.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
        });
      }
      
      res.redirect('/');
    } else {
      req.flash('error', 'Login fehlgeschlagen');
      res.redirect('/login');
    }
  });
});

// logout user
app.get('/logout', loadUser, function(req, res) {
  if (req.session) {
    LoginToken.remove({ email: req.currentUser.email }, function() {});
    res.clearCookie('logintoken');
    req.session.destroy(function() {});
  }
  res.redirect('/');
});

/**
 * RESTful service routes
 */
// fetch latest entries
app.get('/rest/:format/latest', function(req, res) {
  BlogPost.find({}, ['title', 'created', 'slug'], { limit: 5 }).sort('created', -1).run(function(err, posts) {
    switch (req.params.format) {
      case 'json':
        var docs = [];
        for (var i = 0; i < posts.length; i++) {
          var doc = posts[i].doc;
          doc.url = posts[i].url;
          docs.push(doc);
        }
        res.send(docs);
        break;
      default:
        
        break;
    }
  });
});

// rss feed route
app.get('/rss', function(req, res, next) {
  BlogPost.find().limit(50).sort('created', -1).run(function(err, posts) {
    if (err)
      return next(new Error('Fehler beim auslesen der Posts'));
    else {
      // render rss template using posts
      res.render('xml/rss', {
        layout: false,
        selfclosetags: false,
        locals: {
          posts: posts
        }
      });
    }    
  });
});

/**
 * Public Blog routes
 */
// index route, load page 1 of blog
app.get('/', function(req, res){
  // find first 10 blogposts
  BlogPost.find().limit(10).sort('created', -1).run(function(err, posts) {
    res.render('index', {
      locals: {
        posts: posts
      }
    });
  });
});

// paging route, load requested page from database
app.get('/page/:page/', function(req, res) {
  // find blogposts for page
  
  res.render('index', {
    locals: {
      title: 'Paged Indexpage'
    }
  });
});

//about route
app.get('/about', function(req, res){
  res.render('about', {
    locals: {
      
    }
  });
});

function parseDateInts(params) {
  var y = parseInt(params.year);
  var m = parseInt(params.month.trimLeft('0'));
  var d = parseInt(params.day.trimLeft('0'));
  
  if (y === NaN || m === NaN || d === NaN)
    return null;
  
  return {
    y: y,
    m: m,
    d: d
  };
}

function preparePostWhereclause(date, slug) {
  // build search dates
  var searchstart = new Date(Date.UTC(date.y, date.m - 1, date.d));
  var searchend = new Date(Date.UTC(date.y, date.m - 1, date.d, 23, 59, 59));
  
  // return where clause structure
  return {
      slug: slug,
      created: { $gte: searchstart },
      created: { $lte: searchend }
  };
}

// detail route
app.get('/:year/:month/:day/:slug', function(req, res, next) {
  // parse params as integers
  var dateparts = parseDateInts(req.params);
  if (!dateparts)
    return next(new NotFound('Blogpost konnte nicht gefunden werden'));
  
  var whereClause = preparePostWhereclause(dateparts, req.params.slug);
  BlogPost.findOne().where(whereClause).run(function(err, post) {
    if (!post)
      return next(new NotFound('Blogpost konnte nicht gefunden werden'));
    else {
      res.render('blogpost/detail', {
        locals: {
          post: post
        }
      });
    }
  });
});

// save comment
app.post('/:year/:month/:day/:slug/comment', function(req, res) {  
  var dateparts = parseDateInts(req.params);
  if (!dateparts)
    return next(new NotFound('Blogpost konnte nicht gefunden werden'));
  
  var whereClause = preparePostWhereclause(dateparts, req.params.slug);
  BlogPost.findOne().where(whereClause).run(function(err, post) {
    if (!post)
      return next(new NotFound('Blogpost konnte nicht gefunden werden'));
    else {
      // append comment
      var comment = {
          author: req.body.comment.author,
          body: req.body.comment.body,
          title: req.body.comment.title,
          date: new Date()
      };
      post.comments.$push(comment);
      
      function commentCreationFailed() {
        req.flash('error', 'Kommentar konnte nicht gespeichert werden');
        res.render('blogposts/detail', {
          locals: { post: post }
        });
      }
      
      post.save(function(err) {
        if (err)
          return commentCreationFailed();

        req.flash('info', 'Danke! Dein Kommentar wurde gespeichert.');
        res.redirect('/' + req.params.year + '/' + req.params.month + '/' + req.params.day + '/' + req.params.slug + '/');
      }); 
    }
  });
});

//tag search route
app.get('/tags/:tag', function(req, res) {
  // find blogposts matching requested tag
  
  res.render('index', {
    locals: {
      title: 'Tagsearch Indexpage'      
    }
  });
});

// tag list route
app.get('/tags', function(req, res) {
  // find all tags using mapreduce
  var map = function() {
    if (!this.tags)
      return;
    for (idx in this.tags) {
      emit(this.tags[idx], 1);
    }
  };
  var reduce = function(prev, curr) {
    var count = 0;
    for (idx in curr)
      count += curr[idx];
    return count;
  };
  
  // TODO: implement some way to get mapReduce'd collection using mongoose
  
});

/**
 * Administrative Blog routes
 */
// save new user
app.post('/user/create', loadUser, function(req, res) {
  var user = new User(req.body.user);
  
  function userSaveFailed() {
    req.flash('error', 'Fehler beim speichern des Benutzers');
    res.render('users/create', {
      locals: { user: user }
    });
  }
  
  user.save(function(err) {
    if (err) userSaveFailed();
    req.flash('info', 'Benutzer erfolgreich erstellt');
    res.redirect('/');
  });
});

// render user create form
app.get('/user/create', loadUser, function(req, res) {
  res.render('users/create', {
    locals: {
      user: new User()
    }
  });
});

// save new blog post
app.post('/post/create', loadUser, function(req, res) {  
  var post = new BlogPost();
  post.title = req.body.blogpost.title;
  post.preview = req.body.blogpost.preview;
  post.body = req.body.blogpost.body;
  post.created = new Date();
  post.modified = new Date();
  post.tags = req.body.blogpost.tags.split(',');
  
  function postCreationFailed() {
    req.flash('error', 'Fehler beim Erstellen des Posts');
    res.render('blogpost/create', {
      locals: {
        post: post
      }
    });
  }

  post.save(function(err) {
    if (err)
      return postCreationFailed();

    req.flash('info', 'Post erstellt');
    res.redirect('/');
  });
});

// render post creation form
app.get('/post/create', loadUser, function(req, res) {
  res.render('blogpost/create', {
    locals: {
      post: new BlogPost()
    }
  });
});

// delete blog post
app.del('/post/:id', loadUser, function(req, res, next) {
  BlogPost.findById(req.params.id, function(err, bp) {
    if (!bp)
      return next(new NotFound('Blogpost konnte nicht gefunden werden'));
    else {
      bp.remove(function(err) {
        if (err)
          return next(new Error('Blogpost konnte nicht gelöscht werden'));
        else {
          req.flash('info', 'Post wurde gelöscht');
          res.redirect('/');
        }
      });
    }
  });
});

// update blog post
app.put('/post/edit/:id', loadUser, function(req, res, next) {
  BlogPost.findById(req.params.id, function(err, bp) {
    if (!bp)
      return next(new NotFound('Blogpost konnte nicht gefunden werden'));
    else {
      bp.title = req.body.blogpost.title;
      bp.preview = req.body.blogpost.preview;
      bp.body = req.body.blogpost.body;
      bp.tags = req.body.blogpost.tags.split(',');
      bp.modified = new Date();
      
      function postUpdateFailed() {
        req.flash('error', 'Fehler beim updaten des Posts');
        res.render('blogpost/edit', {
          locals: {
            post: bp
          }
        });
      }

      bp.save(function(err) {
        if (err)
          return postUpdateFailed();
        
        req.flash('info', 'Post ge&auml;ndert');
        res.redirect('/');
      });
    }
  });
});

// render update form
app.get('/post/edit/:id', loadUser, function(req, res, next) {
  BlogPost.findById(req.params.id, function(err, bp) {
    if (!bp)
      return next(new NotFound('Blogpost konnte nicht gefunden werden'));
    else {
      res.render('blogpost/edit', {
        locals: {
          post: bp
        }
      });
    }
  });
});

// Only listen on $ node app.js
if (!module.parent) {
  app.listen(app.set('port'));
  console.log("Express server listening on port %d", app.address().port);
}