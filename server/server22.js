/**
 * Created by urec on 01.01.15.
 */
var express = require('express');
var app = express();
var config = require('./config01.json');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var Busboy = require('busboy');
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');
//var mongo = require('mongodb');
var Grid = require('gridfs-stream');
var path = require('path');

var mongoose = require('mongoose');
Grid.mongo = mongoose.mongo;
mongoose.connect('mongodb://localhost/MUSDB');

var conn = mongoose.connection;
//conn.once('open', function () {
//    var gfs = Grid(conn.db, mongoose.mongo);
//
//    // all set!
//});






//var multer = require('multer');
// create or use an existing mongodb-native db instance
//var db = new mongo.Db('MUSDB', new mongo.Server("127.0.0.1", 27017));
//var gfs = Grid(db, mongo);
var gfs = Grid(conn.db, mongoose.mongo);
var schemafs = new mongoose.Schema({
    filename : String,
    md5      : String

});

var fsfiles = mongoose.model('my_collection.files',schemafs);
var fsfile = new fsfiles;

app.set('view engine', 'jade');

//app.use(allowCrossDomain);
    //  app.use(multer({ dest: './tmp/'}));
//app.use(bodyParser({ uploadDir: path.join(__dirname, 'files'), keepExtensions: true }));
//app.use(bodyParser({ uploadDir: '~/WebstormProjects/oggfiller'.join(__dirname, 'files'), keepExtensions: true }));
//app.use(methodOverride());

app.post('/fileupload', function(req, res, next){

    var busboy = new Busboy({ headers: req.headers });



    // handle text field data (code taken from multer.js)
    busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
        if (req.body.hasOwnProperty(fieldname)) {
            if (Array.isArray(req.body[fieldname])) {
                req.body[fieldname].push(val);
            } else {
                req.body[fieldname] = [req.body[fieldname], val];
            }
        } else {
            req.body[fieldname] = val;
            console.log(req.body);
        }
    });

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        var self = {};console.dir(mimetype.split('/'));

        tmpUploadPath = path.join(__dirname, "./tmp/uploads/", filename);
        targetPath = path.join(__dirname, "./tmp/userpics/", filename);

        self.imageName = filename;
        self.imageUrl = filename;


        var re = /(?:\.([^.]+))?$/;
        var cleanFilename = filename.toString().replace(/\.[^/.]+$/, "");
        var fileExtension = re.exec(filename.toString())[1];
        console.dir(cleanFilename+'.'+fileExtension );
        var newFilename = cleanFilename || 'noname';
            newFilename += '.ogg';
        //tmpUploadPath2 = path.join(__dirname, "./tmp/uploads/", newFilename);



        if ((mimetype.split('/')[0]==='audio') || (mimetype.split('/')[0]==='video')) {
            var writestream = gfs.createWriteStream({
                filename : newFilename,
                content_type : 'audio/x-vorbis+ogg',
                root : 'my_collection'
            });



            ffmpeg(file).noVideo().format('ogg').stream()
                .pipe(writestream);                                                         // noVideo нельзя убирать, mp3 файлы с картинками будут глючить
        }
        else
        file.pipe(fs.createWriteStream(tmpUploadPath));
    });

    req.pipe(busboy); // start piping the data.
                                                res.send('oooooook');
    console.log(req.body) // outputs nothing, evaluated before busboy.on('field')
                          // has completed.
});

app.post('/fileupload3333', function (req, res) {
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

app.get('/player', function (req, res) {
    fsfiles.find({}, function(err, docs){
        if (err) { res.json(err) }
        else { res.render('player', { myfiles : docs}) ; console.dir(docs);
        }
    });




   // res.send('Player');
});

app.get('/track/:md5', function (req, res) {
    var _md5 = req.params.md5;
    var cursor = null;
   gfs.collection('my_collection')
        .find({ md5: _md5 }).toArray( function(err, trackfile){
            if (err) throw err ;
            else {
                cursor = trackfile[0];
                if (!!cursor.filename) {
                    var readstream = gfs.createReadStream(
                        {
                            _id  : cursor._id,
                            root : 'my_collection'
                        });
                    // res.contentType('audio/ogg'); //?????!!?
                    console.dir(cursor.filename);
                    readstream.pipe(res);
                }
            };
        });




   // res.pipe(readstream);
   // res.contentType('audio/ogg'); //?????!!?


    //res.sendStatus(200);
});





//////////////////////////////////////////////////
app.listen(3000);

function allowCrossDomain(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}