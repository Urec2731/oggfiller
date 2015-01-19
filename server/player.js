var userfiles = require('./userfilesmodel.js');






module.exports = function (req, res) {

    userfiles.find({ metadata: { oauthID : req.user.oauthID } }, function(err, thefiles){
        if (err) {
            res.json(err)
        }
        else {
            res.render('player', { myfiles : thefiles}) ; //console.dir(thefiles);
        }
    });

};