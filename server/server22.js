/**
 * Created by urec on 01.01.15.
 */
var express = require('express');
var app = express();
var config = require('./config01.json');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var Busboy = require('busboy');
var crypto = require('crypto');
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');
var Grid = require('gridfs-stream');
var path = require('path');




var mongoose = require('mongoose');
Grid.mongo = mongoose.mongo;
mongoose.connect('mongodb://localhost/MUSDB');

var conn = mongoose.connection;


// create a user model
var User = mongoose.model('User', {
    oauthID: Number,
    name: String
});




var transcodeloader = require('./transcodeloader.js');
var multer = require('multer');

var gfs = Grid(conn.db, mongoose.mongo);
var schemafs = new mongoose.Schema({
    filename : String,
    md5      : String,
    aliases  : String

});

var fsfiles = mongoose.model('my_collection.files',schemafs);

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
app.use(transcodeloader({
    dest: './tmp/uploads',
    routeUrl : '/testupload',
    gridfsOptions : {
        mongo : mongoose.mongo,
        connection : conn.db,
        root : 'my_collection'
    }
}));
app.use(multer({ dest: './tmp/'}));    // Back ground loader


// config passport
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



// serialize and deserialize
passport.serializeUser(function(user, done) {
    //console.log('serializeUser: ' + user._id)
    done(null, user._id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user){
        //console.log(user);
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








app.post('/testupload', ensureAuthenticated, function (req, res) {

    if ( req.transcodeErrFiles.length === 0) {
        console.log('no transcode err')
    }
    else {
        console.log('errors in files detected');
        req.transcodeErrFiles.forEach(function (fileAliase) {
            gfs.collection('my_collection')
            .findOne({
                    aliases  : fileAliase,
                    metadata: { oauthID : req.user.oauthID }
                     },
                function(err, errFile) {
                    if (err) res.json(err);
                    else {
                        gfs.collection('my_collection')
                            .remove({_id : errFile._id}, function (err) {
                            if (err) return handleError(err);
                            //console.log('success');
                        });
                    }

                });


        });
    }
    res.redirect('/');

});



app.get('/add', ensureAuthenticated, function (req, res) {

        res.render('uploadform');

});

app.get('/player', ensureAuthenticated, function (req, res) {

        fsfiles.find({ metadata: { oauthID : req.user.oauthID } }, function(err, thefiles){
            if (err) {
                res.json(err)
            }
            else {
                res.render('player', { myfiles : thefiles}) ; //console.dir(thefiles);
            }
        });

});  // render('Player');

app.get('/track/:md5', function (req, res) {
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







});





//////////////////////////////////////////////////
app.listen(3000);

function allowCrossDomain(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}
