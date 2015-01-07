/**
 * Created by urec on 01.01.15.
 */
var express = require('express');
var app = express();
var config = require('./config01.json');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
//var bodyParser = require('body-parser');
//var methodOverride = require('method-override');
//var path = require('path');
var multer = require('multer');




app.set('view engine', 'jade');

app.use(allowCrossDomain);
app.use(multer({ dest: './tmp/'}));
//app.use(bodyParser({ uploadDir: path.join(__dirname, 'files'), keepExtensions: true }));
//app.use(bodyParser({ uploadDir: '~/WebstormProjects/oggfiller'.join(__dirname, 'files'), keepExtensions: true }));
//app.use(methodOverride());



app.post('/fileupload', function (req, res) {
    console.log(req.files);
    res.send('ok');
});


//
//app.post('/todo/create', function (req, res) {
//    // TODO: move and rename the file using req.files.path & .name)
//    res.send(console.dir(req.files));  // DEBUG: display available fields
//   // res.send('<li>One</li><li>Two</li><li>Three</li>');
//
//});

app.get('/ads', function (req, res) {

        //res.send('<li>One</li><li>Two</li><li>Three</li>');

        res.render('aaa');

});

app.get('/contacts', function (req, res) {
    setTimeout(function () {
        res.send('<li>Sergii</li><li>Valera</li>');
    }, 3000);
});

app.get('/mails', function (req, res) {
    setTimeout(function () {
        res.send('<li>Some message</li><li>Just a test</li><li>Something special</li>');
    }, 3000);
});





//////////////////////////////////////////////////
app.listen(3000);

function allowCrossDomain(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}