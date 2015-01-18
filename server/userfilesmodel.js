var mongoose = require('mongoose');


// create a userfiles model
var userfiles = mongoose.model('my_collection.files', {
    filename : String,
    md5      : String,
    aliases  : String
});

module.exports = userfiles;
