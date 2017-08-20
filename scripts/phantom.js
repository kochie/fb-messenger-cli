var system = require('system');
var readlineSync = require('readline-sync');
var page = new WebPage(), testindex = 0, loadInProgress = false, foundValue = false;
var fb_value = '';

var user = system.args[1];
var pass = system.args[2];

page.onConsoleMessage = function(msg) {
  console.log(msg);
};

page.onLoadStarted = function() {
  loadInProgress = true;
  // console.log("load started");
};

page.onLoadFinished = function() {
  loadInProgress = false;
  // console.log("load finished");
};

page.onResourceRequested = function(requestData, networkRequest) {
  //console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
  if (requestData.postData !== undefined) {
    post = requestData.postData.split('&');
    search = 'fb_dtsg=';
    for (i = 0; i < post.length; ++i) {
      if (post[i].indexOf(search) === 0) {
          foundValue = true;
          fb_value = decodeURIComponent(post[i].substr(search.length));
      }
    }
  }
};

var steps = [
  function() {
    //Load Login Page
    page.open("https://www.messenger.com/login");
  },

  function() {
    //Enter Credentials
    page.evaluate(function(user, pass) {
        document.getElementById("email").value = user;
        document.getElementById("pass").value = pass;
        return;
    }, user, pass);
  },

  function() {
    //Login
    page.evaluate(function() {
        var btn = document.getElementById("loginbutton");
        btn.click();
        return;
    });
  },

  //approvals_code

  function(cb) {
    // Evaluate messenger home page
    var callback = true;
    var err = page.evaluate(function() {
      var returnUrl = document.URL;
      if(returnUrl.indexOf('login') != -1){
            // Messenger wants to redirect to facebook for 2FA.
          if (returnUrl.indexOf('checkpoint_interstitial') != -1) {
              var btn = document.getElementsByClassName("_42ft _4jy0 _5f0v _3-mv _4jy4 _517h _51sy")[0]
              btn.click();
              console.log("Clicked");
              callback = false;
          } else {
              console.log("Failed");
              // We didn't get redirected to messenger.com
              // So we had an invalid login
              return new Error('Facebook login failed!');
          }
      }
      return;
    });
    if (callback) {
        console.log("continue");
        cb(err);
    } else {
        console.log("continue");
        return err;
    }
},

function(){
    var err = page.evaluate(function() {
        var returnUrl = document.URL;
        if (returnUrl.indexOf('checkpoint') != -1) {
            return new Error('Facebook login failed!');
        } else {
            document.getElementById('approvals_code').value = readlineSync.question('2FA: ');
            document.getElementById('checkpointSubmitButton').click();
        }
        return
    });
},

function() {
    var err = page.evaluate(function() {
        var returnUrl = document.URL;
        if(returnUrl.indexOf('login') != -1){
              // Messenger wants to redirect to facebook for 2FA.
            if (returnUrl.indexOf('checkpoint_interstitial') != -1) {
                document.getElementsByClassName("_42ft _4jy0 _5f0v _3-mv _4jy4 _517h _51sy")[0].click();
                callback = false;
            } else {
                // We didn't get redirected to messenger.com
                // So we had an invalid login
                return new Error('Facebook login failed!');
            }
        }
        return;
    }
},

function() {
    var err = page.evaluate(function() {
        var returnUrl = document.URL;
        if(returnUrl.indexOf('checkpoint') == -1){
            return new Error('Facebook login failed!');
        } else {
            document.getElementById('checkpointSubmitButton').click();
            return;
        }
    }
},

function() {
    var err = page.evaluate(function() {
        var returnUrl = document.URL;
        if(returnUrl.indexOf('checkpoint') == -1){
            return new Error('Facebook login failed!');
        } else {
            document.getElementById('checkpointSubmitButton').click();
            return;
        }
    }
},

function(cb) {
    var err = page.evaluate(function() {
        var returnUrl = document.URL;
        if(returnUrl.indexOf('checkpoint') == -1){
            return new Error('Facebook login failed!');
        } else {
            document.getElementById('checkpointSubmitButton').click();
            return
        }
    }
    cb(err);
}
];

timeout = undefined;
interval = setInterval(function() {
    if (!loadInProgress && typeof steps[testindex] == "function") {
      steps[testindex](function(err){
        if(err)
          phantom.exit(1);
      });
      testindex++;
    }
    if (typeof steps[testindex] != "function") {

        // Wait until we capture our secret value
        if (foundValue) {
            // Give it a little break, then quit.
            window.setTimeout(function(){
                json = {'fb_dtsg': fb_value};
                cookie = '';
                for (i = 0; i < phantom.cookies.length; ++i){
                    if (i > 0) {
                        cookie += '; ';
                    }

                    cookie += phantom.cookies[i].name + "=" + phantom.cookies[i].value;

                    if (phantom.cookies[i].name == 'c_user') {
                        json['c_user'] = phantom.cookies[i].value;
                    }
                }

                json['cookie'] = cookie;
                console.log(JSON.stringify(json));
                phantom.exit();
            }, 2000);
        }

        if (timeout === undefined) {
            // Allow max 15 seconds to get data
            timeout = window.setTimeout(function(){
                console.log('{"failed":"failed"}');
                phantom.exit();
            }, 15000);
        }
    }
}, 50);
