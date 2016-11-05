var express = require('express');
var app = express();
var spawn = require('child_process').spawn;
var path = require('path');

var fs = require('fs');
var settings = JSON.parse(fs.readFileSync(path.resolve(__dirname, './settings.json'), 'utf8'));

var nhl_script = path.resolve(__dirname, './nhl.sh');
var nhl_css_script = path.resolve(__dirname, './nhl-css.sh');

var newLocalDate = function() {
  return new Date()
    .toLocaleDateString("en-US", {year: 'numeric', month: '2-digit', day: '2-digit', timeZone: "America/Los_Angeles"})
    .replace(/^(..)\/(..)\/(....)$/, '$3-$1-$2');
};

var run = function(command, args, callback) {
  console.log(command, args);
  var child = spawn(command, args);
  var response = '';
  var error = '';
  child.stdout.on('data', function(buffer) {
    response += buffer.toString();
  });
  child.stderr.on('data', function(buffer) {
    error += buffer.toString();
  });
  child.on('close', function(code) {
    if (code === 0) {
      callback(response);
    } else {
      callback(null, error);
    }
  });
};

var send = function (req, res, obj, status) {
  if (settings['Access-Control-Allow-Origin']) {
    res.set('Access-Control-Allow-Origin', settings['Access-Control-Allow-Origin']);
  }

  res.type('json');

  res.status(status || 200);
  var text;
  if (req.query.pretty !== undefined) {
    text = JSON.stringify(obj, null, 2);
  } else {
    text = JSON.stringify(obj);
  }
  res.send(text);
};

var nhlApi = function(req, res, teamName, date) {
  run(nhl_script, [teamName, date], function(json, err) {
    if (err) {
      send(req, res, {
        error: err,
        teamName: teamName,
        date: date
      }, 500);
    } else {
      send(req, res, JSON.parse(json));
    }
  });
};

var validateTeamName = function(req, res, teamName) {
  if (!teamName.match(/^[a-z ]+$/)) {
    send(req, res, {
      error: 'Team name must only contain letters and spaces',
      teamName: teamName
    }, 500);
    return false;
  }
  return true;
};

var validateDate = function(req, res, date) {
  if (!date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
    send(req, res, {
      error: "Date must be in the format 'YYYY-MM-DD'",
      date: date
    }, 500);
    return false;
  }
  return true;
};

console.log('registering /');
app.get('/', function(req, res) {
  console.log('GET ' + req.originalUrl);
  
  send(req, res, {
    apis: [
      '/schedule/:teamName',
      '/schedule/:teamName/:date',
      '/css'
    ]
  });
});

console.log('registering /css');
app.get('/css', function(req, res) {
  console.log('GET ' + req.originalUrl);
  
  run(nhl_css_script, [], function(json, err) {
    if (err) {
      send(req, res, {
        error: err
      }, 500);
    } else {
      send(req, res, JSON.parse(json));
    }
  });
});

console.log('registering /schedule/:teamName');
app.get('/schedule/:teamName', function(req, res) {
  console.log('GET ' + req.originalUrl);
  
  var teamName = req.params.teamName.toLowerCase();
  var date = newLocalDate();

  if (!validateTeamName(req, res, teamName)) return;

  nhlApi(req, res, teamName, date);
});

console.log('registering /schedule/:teamName/:date');
app.get('/schedule/:teamName/:date', function(req, res) {
  console.log('GET ' + req.originalUrl);

  var teamName = req.params.teamName.toLowerCase();
  var date = req.params.date;

  if (!validateTeamName(req, res, teamName)) return;
  if (!validateDate(req, res, date)) return;

  nhlApi(req, res, teamName, date);
});


var port = settings.port;
app.listen(port);
console.log('listening on ' + port);

