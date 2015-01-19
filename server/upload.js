var Grid = require('gridfs-stream');
var userfiles = require('./userfilesmodel.js');

module.exports = function(gridfsOpt) {

    var gfs = Grid(gridfsOpt.connection, gridfsOpt.mongo);

    return function (req, res) {

        if ( req.transcodeErrFiles.length === 0) {
            //console.log('no transcode err')
        }
        else {
            //console.log('errors in files detected');
            //console.dir(req.transcodeErrFileNames);

            req.transcodeErrFiles.forEach(function (fileAliase) {

                userfiles
                    .findOne({
                        aliases  : fileAliase,
                        metadata: { oauthID : req.user.oauthID }
                    },
                    function(err, errFile) {
                        if (err) res.json(err);
                        else {
                            gfs.remove({_id : errFile._id, root : 'my_collection'}, function (err) {
                                if (err) return handleError(err);
                                //console.log('success');
                            });
                        }

                    });


            });
        }
        res.redirect('/');

    }

};