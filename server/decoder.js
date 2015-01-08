
var ffmpeg = require('fluent-ffmpeg');



 ffmpeg('./tmp/a004.mp3').noVideo().output('./tmp/sss3.ogg').run();