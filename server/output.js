var Grid = require('gridfs-stream');

module.exports = function(gridfsOpt) {

    var gfs = Grid(gridfsOpt.connection, gridfsOpt.mongo);

    return function (req, res) {
        var _md5 = req.params.md5;
        var cursor = null;
        var findOptions = req.isAuthenticated() ?
        {
            md5: _md5,
            metadata: {
                oauthID: req.user.oauthID
            }
        } : { aliases : _md5 };

        gfs.collection('my_collection')
            .find(findOptions).toArray( function(err, trackfile){
                if (err) throw err ;
                else {
                    cursor = trackfile[0];
                    if (!!cursor) {
                        var readstream = gfs.createReadStream(
                            {
                                _id  : cursor._id,
                                root : 'my_collection'
                            });
                        //console.dir(cursor.filename);
                        readstream.pipe(res);
                    } else res.sendStatus(404);
                }
            });

    }

};