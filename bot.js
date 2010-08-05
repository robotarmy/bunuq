// load node-irc & other stuff
var irc = require('irc');
var fs = require('fs');
var json = JSON.stringify;
var config = require('./lib/config');


if(config.ircbot() == true) {
	var bot = new irc.Client(config.server(), config.nick(), {
		channels: config.channels(),
	});

	// logging
	if (config.logmode() == 'nstore') {
		var nStore = require('nstore');
		var logfile = nStore(config.logfile());
	} else {
		var logfile = config.logfile();
		var log_fd;
		fs.open(logfile, 'a', mode=0666, function(err, fd) {
			log_fd = fd;
		});
	}

	// load welcome message
	console.log('tocho is getting ready to listen & log...');

	// temp auth 
	var auth = config.auth();

	// load messages to screen
	bot.addListener('message', function (from, to, message) {
	    console.log(from + ' => ' + to + ': ' + message);
		if (config.logmode() == 'nstore') {
			logfile.save(null, {date:Date(), from:from, message:message })
		} else {
			var log_message = (Date() + '__' + from + ':' + message + '\n');
			fs.write(log_fd, log_message, encoding='utf8');
		}
		
		// if socket is on
		if (!(config.webserver() == false)) {
			socket.broadcast(json(from+' says -> '+message));
		}
	});

	bot.addListener('pm', function (from, message) {
	    console.log(from + ' => TOCHO: ' + message);
		if (config.logmode() == 'nstore') {
			logfile.save(null, {date:Date(), from:from, message:message, private: true })
		} else {
			var log_message = (Date() + '__' + from + ':' + message + '\n');
			fs.write(log_fd, log_message, encoding='utf8');
		}
	});

	if(auth == true)
		setTimeout(authbot, 20000);

	function authbot() {
		bot.say('nickserv', ("identify "+config.password()));
		console.log("AUTH SENT.");
	}
	
	// web push via Socket.IO
	// -- not ready yet.
	if(config.webserver() == true) {
		var http = require('http')
		var io = require('socket.io')
		var connect = require('connect')
		var express= require('express')

		// initalizing via express
		var webpush = express.createServer(
			connect.staticProvider(__dirname + '/static/')
		);

		webpush.set('view engine', 'jade');

		webpush.get('/', function(req, res) {
			// only route we'll take for now
			res.render('index', {layout:false}); 
			// future '/search/?q=author' for searching the logs
		});

		webpush.listen(8080);

		console.log('tocho is listening to the web on 8080...');

		var socket = io.listen(webpush);

		socket.on('connection', function() {
			console.log('incoming client...');
		})

		// socket methods
		
	} else {
		var socket = false;
	}
}