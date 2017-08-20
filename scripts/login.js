var Crypt = require('./crypt.js');
var readlineSync = require('readline-sync');
var phantomjs = require('phantomjs-prebuilt');
var path = require('path');
var phantom;

Login = function() { };

Login.prototype.execute = function(callback) {
  var login = this;
  var result = {};

  result.email = readlineSync.question('Email: ');
  result.password = readlineSync.question('Password: ', {hideEchoBack: true});

  console.log("Attempting login...");

  var arguments = [path.resolve(__dirname, 'phantom.js'), result.email, result.password];

  phantom = new login.run_cmd( phantomjs.path, arguments, function () {
    if(phantom.data){
      // Save data in the vault
      crypt = new Crypt(result.password);

      // Add save time to the data
      try {
        var objData = JSON.parse(phantom.data);
      } catch (err) {
        console.log('Warning: Errors caught in return data'.yellow);
        if (phantom.data.indexOf('{') !== -1) {
          let trimmed = phantom.data.substring(phantom.data.indexOf('{'));
          objData = JSON.parse(trimmed);
        }
      }

      objData.saveTime = new Date().getTime();
      crypt.save(JSON.stringify(objData));

      callback(false, result);
    } else {
      console.log('Bad Facebook Login');
      console.log('Phanton response: ', phantom);
      callback(true, null);
    }
  });
};

Login.prototype.run_cmd = function(cmd, args, cb) {
    var spawn = require('child_process').spawn;
    var child = spawn(cmd, args);
    var me = this;
    var data = '';

    child.stdout.on('data', function (buffer) {
        if (me.data === undefined) {
            me.data = buffer.toString();
        } else {
            me.data += buffer.toString();
        }
    });
    child.stdout.on('end', cb);
};

module.exports = Login;
