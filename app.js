
// require dependant modules
var express = require('express'),
  mongoose = require('mongoose'),
  models = require('./models'),
  inspect = require('inspect'),
  stylus = require('stylus'),
  sys = require('sys'),
  db,
  BlogPost;

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
  app.use(express.session({ secret: 'DFKhsdhfus9(JN)(*ri3n9n' }));
  app.use(express.methodOverride());
  app.use(app.router);
  // use express logger
  app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }));
  app.use(express.staticProvider(__dirname + '/public'));
});

// configure environment
app.configure('development', function(){
  app.set('connstring', 'mongodb://localhost/schaermu-blog-dev');
  app.set('port', 3000);
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

// configure models
models.defineModels(mongoose, function() {
  app.BlogPost = BlogPost = mongoose.model('BlogPost');
  db = mongoose.connect(app.set('connstring'));
});

// Routes
// service routes
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


// index route, load page 1 of blog
app.get('/', function(req, res){
  // find first 10 blogposts
  BlogPost.find().limit(10).sort('created', -1).run(function(err, posts) {
    res.render('index', {
      posts: posts
    });
  });
});

// paging route, load requested page from database
app.get('/page/:page/', function(req, res) {
  // find blogposts for page
  
  res.render('index', {
    title: 'Paged Indexpage'
  });
});

// detail route
app.get('/:year/:month/:day/:slug', function(req, res) {
  // find post by date and title
  
  res.render('blogpost/detail', {
    title: 'Detailview for Post'
  });
});

// tag search route
app.get('/tags/:tag', function(req, res) {
  // find blogposts matching requested tag
  
  res.render('index', {
    title: 'Tagsearch Indexpage'
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

// COMMENT: create comment
app.post('/:year/:month/:day/:slug/comment', function(req, res) {
  
});

// ADMIN: create new blog post
app.post('/create', function(req, res) {  
  var post = new BlogPost();
  post.title = req.body.blogpost.title;
  post.preview = req.body.blogpost.preview;
  post.body = req.body.blogpost.body;
  post.created = new Date();
  post.modified = new Date();
  post.tags = req.body.blogpost.tags.split(',');
  
  function postCreationFailed() {
    req.flash('error', 'Fehler beim Erstellen des Posts');
    res.render('blogpost/create',{ latestposts: loadLatestPosts(), post: post });
  }

  // TODO: slug is not generated properly, fix plugin function
  post.save(function(err) {
    if (err) {
      console.log(err);
      return postCreationFailed();
    }
    req.flash('info', 'Post created');
    res.redirect('/');
  });
});
app.get('/create', function(req, res) {
  // TODO: implement basic authentication
  res.render('blogpost/create', {
    post: new BlogPost()
  });
});

// ADMIN: delete blog post
app.del('/post/:id', function(req, res) {
  
});

// ADMIN: update blog post
app.put('/post/:id', function(req, res) {
  
});
app.get('/post/:id', function(req, res) {
  // TODO: implement basic authentication
  Blogpost.findById(req.params.id, function(bp) {
    res.render('blogpost/update', {
      post: bp
    });
  });
});

//Error handling
function NotFound(msg) {
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}

sys.inherits(NotFound, Error);

// This method will result in 500.jade being rendered
app.get('/bad', function(req, res) {
  unknownMethod();
});

app.error(function(err, req, res, next) {
  if (err instanceof NotFound) {
    res.render('404.jade', { status: 404 });
  } else {
    next(err);
  }
});

app.error(function(err, req, res) {
  res.render('500.jade', {
    status: 500,
    error: err
  });
});



// Only listen on $ node app.js
if (!module.parent) {
  app.listen(app.set('port'));
  console.log("Express server listening on port %d", app.address().port);
}