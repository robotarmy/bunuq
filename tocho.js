// load node-irc & other stuff
var irc = require('irc')
var fs = require('fs')
var json = JSON.stringify
var config = require('./lib/config')
var BangLast = require('./lib/bang_last')
var LastLog = require('./lib/last_log')
var SpeakTo = require('./lib/speak_to')

var error_f = function(err) {
  if (err)
    throw err
}


if(config.ircbot() == true) {
	var bot = new irc.Client(config.server(), config.nick(), {
		channels: config.channels(),
	})
  var speaker = SpeakTo.create(bot) // irc client

	// logging
	if (config.logmode() == 'nstore') {
		var nStore = require('nstore')
		var logfile = nStore.new(config.logfile(),error_f)
	} else {
		var logfile = config.logfile()
		var log_fd
		fs.open(logfile, 'a', mode=0666, function(err, fd) {
			log_fd = fd
		})
	}

	// load welcome message
	console.log('tocho is getting ready to listen & log...')

	// temp auth 
	var auth = config.auth()
  //=== !last
  var lastlog = LastLog.create(1000)
  var bang = BangLast.create(lastlog)
  var speak_if_bang = SpeakTo.bang_speaker(bot,bang)
  
	// load messages to screen
	bot.addListener('message', function (from, to, message) {
    json_message = {date:Date(), from:from, message:message }
    speak_if_bang(from,message) // run query first

    lastlog.add(json_message)

		if (config.logmode() == 'nstore') {
			logfile.save(null, json_message ,error_f)
		} else {
			var log_message = (Date() + '__' + from + ':' + message + '\n')
			fs.write(log_fd, log_message, encoding='utf8')
		}
		// if socket is on
		if (!(config.webserver() == false)) {
			socket.broadcast(json(json_message))
		}

	})

	bot.addListener('pm', function (from, message) {
	    console.log(from + ' => TOCHO: ' + message)
		if (config.logmode() == 'nstore') {
			logfile.save(null, {date:Date(), from:from, message:message, private: true },error_f)
		} else {
			var log_message = (Date() + '__' + from + ':' + message + '\n')
			fs.write(log_fd, log_message, encoding='utf8')
		}
	})

	if(auth == true)
		setTimeout(authbot, 20000)

	function authbot() {
		bot.say('nickserv', ("identify "+config.password()))
		console.log("AUTH SENT.")
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
		)

		webpush.set('view engine', 'jade')

		webpush.get('/', function(req, res) {
			// home route for socket.io connection to channel
			res.render('index', {layout:false}) 
		})
		
		webpush.get('/search/:author', function(req, res) {
			var author = req.params.author
			console.log("request for conversations by " + author)
			var mydata = []
			var logSearch = require('./lib/logsearch')
			var search_inst = new logSearch()
			conversations = search_inst.results(config.logfile(),author)
			conversations.on('data', function(chunk) {
				for(var i in chunk)
					mydata.push(chunk[i].message)
				res.render('search', {layout:false, locals:{mydata:mydata,author:author}})
			})
		})

		webpush.listen(8080)

		console.log('tocho is listening to the web on 8080...')

		var socket = io.listen(webpush)

		socket.on('connection', function() {
			console.log('incoming client...')
		})

		// socket methods
		
	} else {
		var socket = false
	}
}
