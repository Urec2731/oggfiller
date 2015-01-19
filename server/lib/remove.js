var Grid = require('gridfs-stream');
var userfiles = require('./../models/userfilesmodel.js');

module.exports = function(gridfsOpt) {

    var gfs = Grid(gridfsOpt.connection, gridfsOpt.mongo);

    return function (req, res) {

        userfiles
            .find({ metadata: { oauthID : req.user.oauthID } }, function(err, thefiles){
                if (err) {
                    res.json(err)
                }
                else {
                    //console.dir(thefiles);
                    thefiles.forEach(function (item) {
                        gfs.remove({_id : item._id, root : 'my_collection'}, function (err) {
                            if (err) throw err;
                            //console.log('success');
                        });

                    });


                    res.redirect('/');
                }
            });

    }
};