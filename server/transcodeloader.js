var os = require('os');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Busboy = require('busboy');
var mkdirp = require('mkdirp');
var qs = require('qs');
var Grid = require('gridfs-stream');
var ffmpeg = require('fluent-ffmpeg');

module.exports = function(options) {

  options = options || {};
  options.includeEmptyFields = options.includeEmptyFields || false;
  options.inMemory = options.inMemory || false;
  options.routeUrl = options.routeUrl || '/my-upload-route-Url';   // new features in configuration
  options.hasDatabaseOpt = !!options.gridfsOptions || false;

  // if the destination directory does not exist then assign uploads to the operating system's temporary directory
  var dest;

  if (options.dest) {
    dest = options.dest;
  } else {
    dest = os.tmpdir();
  }

  mkdirp(dest, function(err) { if (err) throw err; });

  // renaming function for the uploaded file - need not worry about the extension
  // ! if you want to keep the original filename, write a renamer function which does that
  var rename = options.rename || function(fieldname, filename) {
    var random_string = fieldname + filename + Date.now() + Math.random();
    return crypto.createHash('md5').update(random_string).digest('hex');
  };

  return function(req, res, next) {

    var readFinished = false;
    var fileCount = 0;

    req.body = req.body || {};
    req.files = req.files || {};
    req.files.errAliases = [];

    var gfs = options.hasDatabaseOpt ? Grid(options.gridfsOptions.connection, options.gridfsOptions.mongo) : null;

    if (req.headers['content-type'] &&
        req.headers['content-type'].indexOf('multipart/form-data') === 0 &&
        (req.method === 'POST' || req.method === 'PUT') &&
          req.isAuthenticated() &&          // new options
          req.url  === options.routeUrl &&    // new options
          options.hasDatabaseOpt
    ) { //console.dir(req.user);  // main loop

      if (options.onParseStart) { options.onParseStart(); }

      // add the request headers to the options
      options.headers = req.headers;


      var busboy = new Busboy(options);

      // handle text field data
      busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {

        // if includeEmptyFields is false and there is no value then don't
        // attach the fields to req.body
        if (!options.includeEmptyFields && !val) return;

        if (req.body.hasOwnProperty(fieldname)) {
          if (Array.isArray(req.body[fieldname])) {
            req.body[fieldname].push(val);
          } else {
            req.body[fieldname] = [req.body[fieldname], val];
          }
        } else {
          req.body[fieldname] = val;
        }

      });

      // handle files
      busboy.on('file', function(fieldname, fileStream, filename, encoding, mimetype) {

        if (true) { // transcode behaviour


         // var tmpUploadPath = path.join(__dirname, "./uploads/", filename);       // dir ./uploads must be exist



          var cleanFilename = filename.toString().replace(/\.[^/.]+$/, "");
          var newFilename = cleanFilename || 'noname';
          newFilename += '.ogg';






          var random_string = fieldname + filename + Date.now() + Math.random();
          var writestream = gfs.createWriteStream({
            filename : newFilename,
            mode     : 'w',                      // default value: w+, possible options: w, w+ or r, see [GridStore](http://mongodb.github.com/node-mongodb-native/api-generated/gridstore.html)
            content_type : 'audio/x-vorbis+ogg', // For content_type to work properly, set "mode"-option to "w" too!
            root : options.gridfsOptions.root,
            metadata : { oauthID : req.user.oauthID },
            aliases  : crypto.createHash('md5').update(random_string).digest('hex')
          });
          //console.dir(typeof req.user.oauthID);



          /*
           writestream.once('close', function (file) {
           // do something with `file`
           console.log(file.filename);
           // console.dir(this);
           //gfs.remove(file._id, function (err) {
           //    if (err) return handleError(err);
           //    console.log('success');
           //});
           //this.destroy();
           transcodingError = true;
           });*/

          ffmpeg(fileStream).noVideo().format('ogg').stream()
              .pipe(writestream);                                                         // noVideo нельзя убирать, mp3 файлы с картинками будут глючить



        } else { // standart behaviour   ?? typos
          var ext, newFilename, newFilePath;

          // don't attach to the files object, if there is no file
          if (!filename) return fileStream.resume();

          // defines is processing a new file
          fileCount++;

          if (filename.indexOf('.') > 0) { ext = '.' + filename.split('.').slice(-1)[0]; }
          else { ext = ''; }

          newFilename = rename(fieldname, filename.replace(ext, '')) + ext;
          newFilePath = path.join(dest, newFilename);

          var file = {
            fieldname: fieldname,
            originalname: filename,
            name: newFilename,
            encoding: encoding,
            mimetype: mimetype,
            path: newFilePath,
            extension: (ext === null) ? null : ext.replace('.', ''),
            size: 0,
            truncated: null,
            buffer: null
          };

          // trigger "file upload start" event
          if (options.onFileUploadStart) {
            var proceed = options.onFileUploadStart(file);
            // if the onFileUploadStart handler returned null, it means we should proceed further, discard the file!
            if (proceed == false) {
              fileCount--;
              return fileStream.resume();
            }
          }

          var bufs = [];
          var ws;

          if (!options.inMemory) {
            ws = fs.createWriteStream(newFilePath);
            fileStream.pipe(ws);
          }

          fileStream.on('data', function(data) {
            if (data) { file.size += data.length; }
            if (options.inMemory) bufs.push(data);
            // trigger "file data" event
            if (options.onFileUploadData) { options.onFileUploadData(file, data); }
          });

          function onFileStreamEnd() {
            file.truncated = fileStream.truncated;
            if (!req.files[fieldname]) { req.files[fieldname] = []; }
            if (options.inMemory) file.buffer = Buffer.concat(bufs);
            req.files[fieldname].push(file);
            // trigger "file end" event
            if (options.onFileUploadComplete) { options.onFileUploadComplete(file); }

            // defines has completed processing one more file
            fileCount--;
            onFinish();
          }

          if (options.inMemory)
            fileStream.on('end', onFileStreamEnd);
          else
            ws.on('finish', onFileStreamEnd);

          fileStream.on('error', function(error) {
            // trigger "file error" event
            if (options.onError) { options.onError(error, next); }
            else next(error);
          });

          fileStream.on('limit', function () {
            if (options.onFileSizeLimit) { options.onFileSizeLimit(file); }
          });

          function onFileStreamError(error) {
            // trigger "file error" event
            if (options.onError) { options.onError(error, next); }
            else next(error);
          }

          if (options.inMemory)
            fileStream.on('error', onFileStreamError );
          else
            ws.on('error', onFileStreamError );

        }   // end of standart behaviour ?? typos

      });

      busboy.on('partsLimit', function() {
        if (options.onPartsLimit) { options.onPartsLimit(); }
      });

      busboy.on('filesLimit', function() {
        if (options.onFilesLimit) { options.onFilesLimit(); }
      });

      busboy.on('fieldsLimit', function() {
        if (options.onFieldsLimit) { options.onFieldsLimit(); }
      });

      busboy.on('finish', function() {
        readFinished = true;
        onFinish();
      });

      /**
       * Pass the control to the next middleware in stack
       * only if the read and write stream are finished
       */
      var onFinish = function () {
        if (!readFinished || fileCount > 0) return;

        for (var field in req.files) {
          if (req.files[field].length === 1) {
            req.files[field] = req.files[field][0];
          }
        }

        // Parse the body and create a best structure
        req.body = qs.parse(req.body);

        // when done parsing the form, pass the control to the next middleware in stack
        if (options.onParseEnd) { options.onParseEnd(req, next); }
        else { next(); }
      };

      req.pipe(busboy);

    }

    else { return next(); }

  }

}
