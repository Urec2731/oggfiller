/**
 * Created by urec on 01.01.15.
 */
var express = require('express');
var app = express();


var Busboy = require('busboy');
var crypto = require('crypto');
var fs = require('fs');
//var ffmpeg = require('fluent-ffmpeg');    // del me
var Grid = require('gridfs-stream');
var path = require('path');
var userfiles = require('./userfilesmodel.js');

var config = require('./config01.json');
var User = require('./usersmodel.js');
var mongoose = require('mongoose');
var passport = require('passport');
var auth = require('./authentication.js');
Grid.mongo = mongoose.mongo;
mongoose.connect('mongodb://localhost/MUSDB');

var conn = mongoose.connection;





var transcodeloader = require('./transcodeloader.js');
var multer = require('multer');

var gfs = Grid(conn.db, mongoose.mongo);
//var schemafs = new mongoose.Schema({
//    filename : String,
//    md5      : String,
//    aliases  : String
//
//});
//
//var userfiles = mongoose.model('my_collection.files',schemafs);

app.set('view engine', 'jade');

app.use(allowCrossDomain);

app.use(require('express-session')({
    key: 'session',
    secret: 'SUPER SECRET SECRET',
    store: require('mongoose-session')(mongoose, {ttl: 3600, modelName : 'Session'}),
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

//
var gridfsOpt = {
    mongo : mongoose.mongo,
        connection : conn.db,
        root : 'my_collection'
};

//
app.use(transcodeloader({
    dest : './tmp/uploads',
    routeUrl : '/testupload',
    //digest : 'base64',        // bugs detected such as hliwrpHyK5Sgo/K4EL7EJg== hashe
    gridfsOptions : {
        mongo : mongoose.mongo,
        connection : conn.db,
        root : 'my_collection'
    }
}));
app.use(multer({ dest: './tmp/'}));    // Back ground loader


// config passport
/*
passport.use(new FacebookStrategy({
        clientID: config.facebook.clientID,
        clientSecret: config.facebook.clientSecret,
        callbackURL: config.facebook.callbackURL
    },
    function(accessToken, refreshToken, profile, done) {
        User.findOne({ oauthID: profile.id }, function(err, user) {
            if(err) { console.log(err); }
            if (!err && user != null) {
                done(null, user);
            } else {
                var user = new User({
                    oauthID: profile.id,
                    name: profile.displayName,
                    created: Date.now()
                });
                user.save(function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                        //console.log("saving user ...");
                        done(null, user);
                    };
                });
            };
        });
    }
));

*/

// serialize and deserialize
passport.serializeUser(function(user, done) {
   // console.log('serializeUser: ' + user._id)
    done(null, user._id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user){
     //   console.log(user);
        if(!err) done(null, user);
        else done(err, null)
    })
});


// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
app.get('/auth/facebook', passport.authenticate('facebook'));


// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { successRedirect: '/',
        failureRedirect: '/login' }));

//-----------------------------------------------------

// test authentication
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/')
}



//-----------------------------------------------------


app.get('/', function (req, res) {
    res.render(!!req.user ? "user" : "guest", { user: req.user });
});



app.get('/login', function (req, res) {

   res.send('<h1>  not realized yet </h1>');
   // res.render('login_incorrect');

});



app.get('/logout', function(req, res){
    req.logout(); //res.send('logout');
     res.redirect('/');
});








app.post('/testupload', ensureAuthenticated,  require('./upload.js')(gridfsOpt));



app.get('/add', ensureAuthenticated, function (req, res) {

        res.render('uploadform');

});

app.get('/remove', ensureAuthenticated, function (req, res) {

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

});  // remove
app.get('/player', ensureAuthenticated, require('./player.js'));  // render('Player');

app.get('/track/:md5', require('./output.js')(gridfsOpt)); // track





//////////////////////////////////////////////////
app.listen(3000);

function allowCrossDomain(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}
