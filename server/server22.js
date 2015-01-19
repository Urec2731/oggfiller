/**
 * Created by urec on 01.01.15.
 */
var express = require('express');
var app = express();


var Busboy = require('busboy');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var User = require('./models/usersmodel.js');
var mongoose = require('mongoose');
var passport = require('passport');
var auth = require('./authentication.js');

mongoose.connect('mongodb://localhost/MUSDB');

var conn = mongoose.connection;



var transcodeloader = require('./transcodeloader.js');
var multer = require('multer');


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
    //digest : 'base64',        // bugs detected such as hliwrpHyK5Sgo/K4EL7EJg== hashes
    gridfsOptions : {
        mongo : mongoose.mongo,
        connection : conn.db,
        root : 'my_collection'
    }
}));
app.use(multer({ dest: './tmp/'}));    // Back ground loader



// serialize and deserialize user
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

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { successRedirect: '/',
        failureRedirect: '/login' }));



app.get('/', function (req, res) {
    res.render(!!req.user ? "user" : "guest", { user: req.user });
});



app.get('/login', function (req, res) {

   res.sendStatus(404);


});



app.get('/logout', function(req, res){
     req.logout();
     res.redirect('/');
});








app.post('/testupload', ensureAuthenticated,  require('./upload.js')(gridfsOpt));


app.get('/add', ensureAuthenticated, require('./add.js'));

app.get('/remove', ensureAuthenticated, require('./remove.js')(gridfsOpt));

app.get('/player', ensureAuthenticated, require('./player.js'));

app.get('/track/:md5', require('./output.js')(gridfsOpt));





//////////////////////////////////////////////////
app.listen(3000);

function allowCrossDomain(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}



// test authentication
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/')
}



//-----------------------------------------------------
