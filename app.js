
// require dependant modules
var express = require('express'),
  mongoose = require('mongoose'),
  models = require('./models'),
  db,
  BlogPost;

// create server object
var app = module.exports = express.createServer();

// configure server instance
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyDecoder());
  app.use(express.methodOverride());
  app.use(app.router);
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
  // find all tags
  
  res.render('taglist', {
    title: 'Taglist'
  });
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

  // TODO: slug is not generated properly, fix plugin function
  post.save(function(err) {
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


// Only listen on $ node app.js
if (!module.parent) {
  app.listen(app.set('port'));
  console.log("Express server listening on port %d", app.address().port)
}