var express = require('express');
var cors = require('cors');
var app  = express();
var crypto = require('crypto');
var server = require('http').Server(app);
var io = require('socket.io')(server);

var bodyParser = require('body-parser');

app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

var cookieParser = require("cookie-parser");
app.use(cookieParser());

var session = require("cookie-session");
app.use(session({keys: ['secret']}));

var sql = require('./models/sqlConn');  

app.use(cors());
app.set('port', (process.env.PORT || 5000));

var usersObj = {};

var mustBeAuthenticated = function(req, res, next) {
	console.log('auth: ', req.body, req.query);
	var api_key;

	if(req.method == 'GET')
		api_key = req.query.api_token;
	else
		api_key = req.body.api_token;

	usersObj[api_key] ? next() : res.send({"message": "You haven't permission!"});
}

app.post('/login', function(req, res, next) {
		console.log('user: ', req.body, req.query);
		var creds = {
			username: req.body.username,
			password: req.body.password
		};

		sql.users.getUser(creds, function(error, results, fields){
			 if (error) {
			 	console.log('error: ', error);
			 	res.json({message: "Ошибка в подключении к базе данных"});
			 }
			 else{	

			 	if(results.length){
			 		var hash = crypto.createHash('sha256');
			 		var d = new Date();
					var n = d.getTime();
					var pass = results[0].id.toString() + n.toString();
					hash.update(pass);
					var api_key = hash.digest('hex');
					var userType;

					if(results[0].usertype == 1)
						userType = 'administrator';
					else if(results[0].usertype == 2)
						userType = 'manager';
					else
						userType = 'courier';	
	
					usersObj[api_key] = {
						user_type: results[0].usertype,
						username: results[0].username,
						user_id: results[0].id
					};	

					if(usersObj[api_key].user_type == 3)
						usersObj[api_key].startedTrace = false;

			 		res.json({message: {api: api_key, user_type: userType}});
			 	}

				else {
					res.json({message: "Неверный логин или пароль"});
					
				}
				
			}	
		}); 	
});

app.all("*", mustBeAuthenticated);

// users api 

app.get('/profile', function(req, res){
	sql.users.getUserById(req.query.userID, function(error, results, fields){
		if (error)
			res.send(error);
		else
			res.json(results[0]);
	});
});

app.get('/logout', function(req, res) {
	var userApi = req.query.api_token;
	usersObj[userApi].startedTrace = false;
	io.sockets.emit('couirerOffline', {user_id: usersObj[userApi].user_id});
	delete usersObj[req.query.api_token];
	res.send("You logged out!");
});

// courier api 

app.get('/get/list/courier', function(req, res){
	var data = {
		currentUserType : usersObj[req.query.api_token].user_type,
		userType: "3",
		managerId: usersObj[req.query.api_token].user_id
	};

	sql.users.getUsers(data, function(error, results, fields){
		if(error)
			res.send(error);
		else{
			for(var u in usersObj){
				if(usersObj[u].startedTrace){
					for(var r in results){
						if(results[r].id == usersObj[u].user_id)
							results[r].startedTrace = true;
					}
				}
			}
			res.json(results);	
		}
	});
});

app.get('/get/courier', function(req, res){
	sql.users.getUserById(req.query.userID, function(error, results, fields){
		if (error)
			res.send(error);
		else{	
			res.json(results[0]);
		}
	});
});

app.post('/add/courier', function(req, res){
	var data = {
		username: req.body.username,
		password: req.body.password,
		passcode: req.body.passcode ? req.body.passcode : null,
		email: req.body.email ? req.body.email : null,
		phone: req.body.phone ? req.body.phone : null,
		first_name: req.body.first_name ? req.body.first_name : null,
		last_name: req.body.last_name ? req.body.last_name : null,
		middle_name: req.body.middle_name ? req.body.middle_name : null,
		filial_id: req.body.filial_id ? req.body.filial_id : null,
		manager_id: req.body.manager_id,
		date_start_work: req.body.date_start_work ? req.body.date_start_work : null,
		usertype: "3"
	};

	if(usersObj[req.body.api_token].user_type == 2)
		data.manager_id = usersObj[req.body.api_token].user_id;

	sql.users.addUser(data, function(error, results, fields){
		if(error)
			res.send(error);
		else
			res.send('success');	
	});
});

app.post('/del/courier', function(req, res){
	sql.users.removeUser(req.body.user_id, function(error, results, fields){
		if(error)
			res.send(error);
		else if(results.affectedRows)
			res.send('success');	
		else
			res.send('not found');	
	});
});

app.post('/edit/courier', function(req, res){
	var data = {};

	if(req.body.username)
		data.username = req.body.username;
	if(req.body.password)
		data.password = req.body.password;
	if(req.body.passcode)
		data.passcode = req.body.passcode;	
	if(req.body.email)
		data.email = req.body.email;
	if(req.body.phone)
		data.phone = req.body.phone;
	if(req.body.first_name)
		data.first_name = req.body.first_name;
	if(req.body.last_name)
		data.last_name = req.body.last_name;
	if(req.body.middle_name)
		data.middle_name = req.body.middle_name;
	if(req.body.filial_id)
		data.filial_id = req.body.filial_id;
	if(req.body.manager_id)
		data.manager_id = req.body.manager_id;
	if(req.body.date_start_work)
		data.date_start_work = req.body.date_start_work;

	sql.users.editUser(req.body.user_id, data, function(error, results, fields){
		if(error)
			res.send(error);
		else if(results.changedRows)
			res.send('success');	
		else
			res.send('not found');	
	});
});

// manager api 

app.get('/get/list/manager', function(req, res){
	var data = {
		currentUserType : usersObj[req.query.api_token].user_type,
		userType: "2",
		managerId: usersObj[req.query.api_token].user_id
	};

	sql.users.getUsers(data, function(error, results, fields){
		if(error)
			res.send(error);
		else
			res.json(results);	
	});
});

app.get('/get/manager', function(req, res){
	sql.users.getUserById(req.query.user_id, function(error, results, fields){
		if (error)
			res.send(error);
		else
			res.json(results[0]);
	});
});

app.post('/add/manager', function(req, res){
	var data = {
		username: req.body.username,
		password: req.body.password,
		email: req.body.email ? req.body.email : null,
		phone: req.body.phone ? req.body.phone : null,
		first_name: req.body.first_name ? req.body.first_name : null,
		last_name: req.body.last_name ? req.body.last_name : null,
		middle_name: req.body.middle_name ? req.body.middle_name : null,
		filial_id: req.body.filial_id ? req.body.filial_id : null,
		manager_id: "0",
		date_start_work: req.body.date_start_work ? req.body.date_start_work : null,
		usertype: "2"
	};

	sql.users.addUser(data, function(error, results, fields){
		if(error)
			res.send(error);
		else
			res.send('success');	
	});
});

app.post('/del/manager', function(req, res){
	sql.users.removeUser(req.body.user_id, function(error, results, fields){
		if(error)
			res.send(error);
		else if(results.affectedRows)
			res.send('success');	
		else
			res.send('not found');	
	});
});

app.post('/edit/manager', function(req, res){
	var data = {};

	if(req.body.username)
		data.username = req.body.username;
	if(req.body.password)
		data.password = req.body.password;
	if(req.body.email)
		data.email = req.body.email;
	if(req.body.phone)
		data.phone = req.body.phone;
	if(req.body.first_name)
		data.first_name = req.body.first_name;
	if(req.body.last_name)
		data.last_name = req.body.last_name;
	if(req.body.middle_name)
		data.middle_name = req.body.middle_name;
	if(req.body.filial_id)
		data.filial_id = req.body.filial_id;
	if(req.body.date_start_work)
		data.date_start_work = req.body.date_start_work;

	sql.users.editUser(req.body.user_id, data, function(error, results, fields){
		if(error)
			res.send(error);
		else if(results.changedRows)
			res.send('success');	
		else
			res.send('not found');	
	});
});

// coords api 

app.get('/get/list/coordinates', function(req, res){

	var data = {
		courierId: req.query.user_id
	};

	sql.trace.getCoords(data, function(error, results, fields){
		var coordResults = results;

		if(error)
			res.send(error);
		else{
			sql.products.getProducts(function(error, results, fields){
					var prodResults = results;

					if(error){
						res.send(error);
					}
					else {
						res.json({prodResults: prodResults, coordResults: coordResults});
					}
				});
				
		}
	});
});

app.post('/set/coordinates', function(req, res){
	console.log('setted coords: ', req.body);
	var reqBody = req.body;
	var now = new Date();

	var data = {
		latitude: reqBody.latitude,
		longitude: reqBody.longitude,
		courier_id: usersObj[reqBody.api_token].user_id,
		date: now
	};

	if(reqBody.isManual){
		data.isManual = 1;
		data.isSuccess = parseInt(reqBody.isSuccess);
		data.comment = reqBody.comment;
		
		if(reqBody.newsNum !== undefined && reqBody.newsNum !== null)
			data.news_num = reqBody.newsNum;
	} else
		data.isManual = 0;

	
	
	sql.trace.setCoord(data, function(error, results, fields){
		if(error)
			res.send(error);
		else{
			if(reqBody.isManual && reqBody.newsNum){
				var prodData = {
					sector_id: reqBody.sector_id,
					sector_num: reqBody.sector_num,
					count: reqBody.newsNum,
					courier_id: usersObj[reqBody.api_token].user_id,
					date: now
				};

				sql.products.setProduct(prodData, function(error, results, fields){
					if(error){
						console.log(error);
						res.send(error);
					}
					else{ 
							if(usersObj[reqBody.api_token].startedTrace){
								usersObj[reqBody.api_token].lastTime = (new Date()).getTime();
								io.sockets.emit('currentCoord', data);	
							} else {
								usersObj[reqBody.api_token].startedTrace = true;
								usersObj[reqBody.api_token].lastTime = (new Date()).getTime();
								io.sockets.emit('couirerOnline', {user_id: usersObj[reqBody.api_token].user_id});
								sectorInterval(reqBody.api_token);
								io.sockets.emit('currentCoord', data);
							}
							res.send('success');
						}	
				});
			}
			else{
				if(usersObj[reqBody.api_token].startedTrace){
					usersObj[reqBody.api_token].lastTime = (new Date()).getTime();
					io.sockets.emit('currentCoord', data);
				} else {
					usersObj[reqBody.api_token].startedTrace = true;
					usersObj[reqBody.api_token].lastTime = (new Date()).getTime();
					io.sockets.emit('couirerOnline', {user_id: usersObj[reqBody.api_token].user_id});
					sectorInterval(reqBody.api_token);
					io.sockets.emit('currentCoord', data);
				}
				res.send('success');
			}
		}
	});
	

});

// sectors api 

app.get('/startSector', function(req, res){
	var userApi = req.query.api_token;
	console.log("sector started: ", usersObj[userApi]);
	usersObj[userApi].startedTrace = true;
	usersObj[userApi].lastTime = (new Date()).getTime();
	io.sockets.emit('couirerOnline', {user_id: usersObj[userApi].user_id});
	sectorInterval(userApi);
	res.send('Sector started.');
});

app.get('/endSector', function(req, res){
	var userApi = req.query.api_token;
	console.log("sector ended: ", usersObj[userApi]);
	usersObj[userApi].startedTrace = false;
	io.sockets.emit('couirerOffline', {user_id: usersObj[userApi].user_id});
	res.send('Sector ended.');
});

function sectorInterval(api){
	var myInterval = setInterval(function(){
		var now = (new Date().getTime());
		var dist = now - usersObj[api].lastTime;
		if(dist>=299999){
			usersObj[api].startedTrace = false;
			io.sockets.emit('couirerOffline', {user_id: usersObj[api].user_id});
			clearInterval(myInterval);
		}
	}, 300000);
}

app.get('/get/list/sectors', function(req, res){
	var userApi = req.query.api_token;
	sql.sectors.getSectors(function(error, results, fields){
			var sectResults = results;

			if(error){
				res.send(error);
			}
			else{
				for(var r in sectResults){
							if(sectResults[r].manager_id == usersObj[userApi].user_id || usersObj[userApi].user_type == 1)
								sectResults[r].editable = true;
							else
								sectResults[r].editable = false;

							sectResults[r].coords = JSON.parse(sectResults[r].coords);	
						}

						res.json(sectResults);
			}
		});
});

app.post('/add/sectors', function(req, res){

	var data = {
		title: req.body.sectorTitle,
		manager_id: usersObj[req.body.api_token].user_id,
		coords: JSON.stringify(req.body.sectorCoords)
	};

	sql.sectors.addSectors(data, function(error, results, fields){
		if(error)
			res.send({'message':'fail'});
		else 
			res.send({'message': 'success', 'id': results.insertId});	
	
	});
});

app.post('/edit/sectors', function(req, res){
	var data = {
		title: req.body.sectorTitle
	};

	if(req.body.sectorCoords)
		data.coords = JSON.stringify(req.body.sectorCoords);

	sql.sectors.editSectors(req.body.sectorID, data, function(error, results, fields){
		if(error)
			res.send(error);
		else 
			res.send('success');	

	});
});

app.post('/del/sectors', function(req, res){
	sql.sectors.removeSectors(req.body.sectorID, function(error, results, fields){
		if(error)
			res.send(error);
		else if(results.affectedRows)
			res.send('success');	
		else
			res.send('not found');	
	});
});


server.listen(app.get('port'), function(){
	console.log('Running on 5000!');
});
