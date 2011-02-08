function defineModels(mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;
  
  // define BlogPost schema
  var BlogPost = new Schema({
    title: String,
    preview: String,
    body: String,
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
      
      return '/' + year + '/' + (month < 10 ? '0' + month : month) + '/' + (day < 10 ? '0' + day : day) + '/' + this.slug;
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
  
  // define Comment schema
  var Comment = new Schema({
    author: String,
    date: Date,
    body: String
  });
  
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
  
  // export model
  mongoose.model('BlogPost', BlogPost);
  fn();
}

exports.defineModels = defineModels;