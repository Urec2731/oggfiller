var mongoose = require('mongoose');


// create a userfiles model
var userfiles = mongoose.model('my_collection.files', {
    filename : String,
    md5      : String,
    aliases  : String
});

//userfiles.remove = function () { throw 'dont use this method in the GridFs collection'};
module.exports = userfiles;
