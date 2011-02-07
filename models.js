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
  
  // define virtual getter method for id (readable string)
  BlogPost.virtual('id')
    .get(function() {
      return this._id.toHexString();
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
        this.slug = v.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/-+/g, '');
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