var express = require('express');
var app = express();
var spawn = require('child_process').spawn;
var path = require('path');

var fs = require('fs');
var settings = JSON.parse(fs.readFileSync(path.resolve(__dirname, './settings.json'), 'utf8'));

var nhl_script = path.resolve(__dirname, './nhl.sh');
var nhl_css_script = path.resolve(__dirname, './nhl-css.sh');

function run(command, args, callback) {
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
}

var send = function (req, res, obj, status) {
  if (settings['Access-Control-Allow-Origin']) {
    res.header('Access-Control-Allow-Origin', settings['Access-Control-Allow-Origin']);
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
  }
};

var validateDate = function(req, res, date) {
  if (!date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
    send(req, res, {
      error: "Date must be in the format 'YYYY-MM-DD'",
      date: date
    }, 500);
  }
};

console.log('registering /');
app.get('/', function(req, res) {
  console.log('GET ' + req.originalUrl);
  
  send(req, res, {
    apis: [
      '/:teamName',
      '/:teamName/:date',
      '/css'
    ]
  });
});

console.log('registering /_css');
app.get('/_css', function(req, res) {
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

console.log('registering /:teamName');
app.get('/:teamName', function(req, res) {
  console.log('GET ' + req.originalUrl);
  
  var teamName = req.params.teamName.toLowerCase();
  var date = new Date().toISOString().substring(0, 10);

  validateTeamName(req, res, teamName);

  nhlApi(req, res, teamName, date);
});

console.log('registering /:teamName/:date');
app.get('/:teamName/:date', function(req, res) {
  console.log('GET ' + req.originalUrl);

  var teamName = req.params.teamName.toLowerCase();
  var date = req.params.date;

  validateTeamName(req, res, teamName);
  validateDate(req, res, date);

  nhlApi(req, res, teamName, date);
});


var port = settings.port;
app.listen(port);
console.log('listening on ' + port);

