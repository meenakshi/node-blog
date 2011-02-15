var crypto = require('crypto');

function convertBasicMarkup(input, allowHtml) {
  var strongRe = /[*]{2}([^*]+)[*]{2}/gm;
  var emRe = /[*]{1}([^*]+)[*]{1}/gm;
  var linkRe = /\[([^\]]*)\]\(([^\)]*?)\)/gm;
  var nlRe = /\r\n/gm;
  var crRe = /\r/gm;
  
  // special re's to revert linebreaks from <br />
  var codeRe = /(<code\b[^>]*>(.*?)<\/code>)/gm;
  
  // cleanup newlines
  input = input.replace(nlRe, "\n");
  input = input.replace(crRe, "\n");
  
  // strip existing html before inserting breaks/markup
  if (!allowHtml) {
    // strip html
    input = input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  // convert newlines to breaks
  input = input.replace(/\n/gm, '<br />');
  
  // replace basic markup
  input = input.replace(strongRe, function(whole, m1, m2, m3) {
    return '<strong>' + m1 + '</strong>';
  });
  
  input = input.replace(emRe, function(whole, m1, m2, m3) {
    return '<em>' + m1 + '</em>';
  });
  
  input = input.replace(linkRe, function(whole, m1, m2) {
    // fix up protocol
    if (!m2.match(/(http(s?)|ftp(s?)):\/\//gm))
      // prepend http as default
      m2 = 'http://' + m2;
    return '<a href=\"' + m2 + '\" target=\"_blank\">' + m1 + '</a>';
  });
  
  // revert code blocks
  input = input.replace(codeRe, function(whole, m1) {
    return m1.replace(/<br \/>/gm, '\n');
  });
    
  return input;
}

function defineModels(mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;
    
  /**
   * Comment model
   * 
   * Used for persisting user comments
   */
  var Comment = new Schema({
    author: String,
    title: String,
    date: Date,
    body: String
  });
  
  // register virtual members
  Comment.virtual('readableday')
    .get(function() {
      var day = this.date.getDate();      
      return (day < 10 ? '0' + day : day);
    });

  Comment.virtual('readablemonth')
    .get(function() {
      return monthNamesShort[this.date.getMonth()];
    });
  
  Comment.virtual('readabletime')
    .get(function() {
      var hour = this.date.getHours();
      var minute = this.date.getMinutes();
      return (hour < 10 ? '0' +  hour : hour) + ':' + (minute < 10 ? '0' +  minute : minute);
    });
  
  Comment.virtual('bodyParsed')
    .get(function() {
      return convertBasicMarkup(this.body, false);
    });
  
  // register validators
  Comment.path('author').validate(function(val) {
    return val.length > 0;
  }, 'AUTHOR_MISSING');
  
  Comment.path('body').validate(function(val) {
    return val.length > 0;
  }, 'BODY_MISSING');
  
  /**
   * Blogpost model
   * 
   * Used for persisting blog posts
   */
  var BlogPost = new Schema({
    title: String,
    preview: String,
    body: String,
    rsstext: String,
    slug: String,
    created: Date,
    modified: Date,
    tags: [String],
    comments: [Comment]
  });
    
  var monthNames = [ 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
                     'August', 'September', 'Oktober', 'November', 'Dezember' ];
  var monthNamesShort = [ 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul',
                          'Aug', 'Sep', 'Okt', 'Nov', 'Dez' ];
    
  // define virtual getter method for id (readable string)
  BlogPost.virtual('id')
    .get(function() {
      return this._id.toHexString();
    });
  
  BlogPost.virtual('url')
    .get(function() {
      // build url for current post
      var year = this.created.getFullYear();
      var month = this.created.getMonth() + 1;
      var day = this.created.getDate();      
      return '/' + year + '/' + (month < 10 ? '0' + month : month) + '/' + (day < 10 ? '0' + day : day) + '/' + this.slug + '/';
    });
  
  BlogPost.virtual('rfc822created')
    .get(function() {
      return this.created.toGMTString();
    });
    
  BlogPost.virtual('readabledate')
    .get(function() {
      var year = this.created.getFullYear();
      var month = monthNames[this.created.getMonth()];
      var day = this.created.getDate();      
      return (day < 10 ? '0' + day : day) + '. ' + month + ' ' + year;
    });
  
  BlogPost.virtual('readableday')
    .get(function() {
      var day = this.created.getDate();      
      return (day < 10 ? '0' + day : day);
    });
  
  BlogPost.virtual('readablemonth')
    .get(function() {
      return monthNamesShort[this.created.getMonth()];
    });
  
  BlogPost.virtual('previewParsed')
    .get(function() {
      return convertBasicMarkup(this.preview, true);
    });

  BlogPost.virtual('bodyParsed')
    .get(function() {
      return convertBasicMarkup(this.body, true);
    });
  
  // register validators
  BlogPost.path('title').validate(function(val) {
    return val.length > 0;
  }, 'TITLE_MISSING');
  
  BlogPost.path('preview').validate(function(val) {
    return val.length > 0;
  }, 'PREVIEW_MISSING');
  
  BlogPost.path('rsstext').validate(function(val) {
    return val.length > 0;
  }, 'RSSTEXT_MISSING');
  
  BlogPost.path('body').validate(function(val) {
    return val.length > 0;
  }, 'BODY_MISSING');
  
  // generate a proper slug value for blogpost
  function slugGenerator (options){
    options = options || {};
    var key = options.key || 'title';
    return function slugGenerator(schema){
      schema.path(key).set(function(v){
        this.slug = v.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/\++/g, '');
        return v;
      });
    };
  };
  
  // attach slugGenerator plugin to BlogPost schema
  BlogPost.plugin(slugGenerator());
  
  /**
   * User model
   * 
   * Used for persisting administration users
   */
  
  function validatePresenceOf(value) {
    return value && value.length;
  }
  
  User = new Schema({
    'email': { type: String, validate: [validatePresenceOf, 'Email Adresse benoetigt'], index: { unique: true } },
    'name': String,
    'hashed_password': String,
    'salt': String
  });
  
  User.virtual('id')
    .get(function() {
      return this._id.toHexString();
  });
  
  User.virtual('password')
    .set(function(pw) {
      this._password = pw;
      this.salt = this.createSalt();
      this.hashed_password = this.encryptPassword(pw);
    })
    .get(function() { return this._password; });
  
  User.method('authenticate', function(plain) {
    return this.encryptPassword(plain) === this.hashed_password;
  });
  
  User.method('createSalt', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });
  
  User.method('encryptPassword', function(str) {
    return crypto.createHmac('sha1', this.salt).update(str).digest('hex');
  });
  
  User.pre('save', function(next) {
    if (!validatePresenceOf(this.password)) {
      next(new Error('Ungueltiges Passwort'));
    } else {
      next();
    }
  });
  
  /**
   * LoginToken model
   * 
   * Used for persisting session tokens
   */
  LoginToken = new Schema({
    email: { type: String, index: true },
    series: { type: String, index: true },
    token: { type: String, index: true }
  });
  
  LoginToken.virtual('id')
    .get(function() {
      return this._id.toHexString();
  });

  LoginToken.virtual('cookieValue')
    .get(function() {
      return JSON.stringify({ email: this.email, token: this.token, series: this.series });
    });
  
  LoginToken.method('randomToken', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });

  LoginToken.pre('save', function(next) {
    this.token = this.randomToken();
    this.series = this.randomToken();
  });
  
  // export models
  mongoose.model('BlogPost', BlogPost);
  mongoose.model('User', User);
  mongoose.model('LoginToken', LoginToken);
  fn();
}

exports.defineModels = defineModels;