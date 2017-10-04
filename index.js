var express = require('express');
var cors = require('cors');
var app  = express();
var crypto = require('crypto');

var bodyParser = require('body-parser');
app.use(bodyParser());

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
		else
			res.json(results);	
	});
});

app.get('/get/courier', function(req, res){
	sql.users.getUserById(req.query.userID, function(error, results, fields){
		if (error)
			res.send(error);
		else
			res.json(results[0]);
	});
});

app.post('/add/courier', function(req, res){
	var data = {
		username: req.body.username,
		password: req.body.password,
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
		if(error)
			res.send(error);
		else
			res.json(results);	
	});
});

app.post('/set/coordinates', function(req, res){
	console.log('coords: ', req.body);
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
					sector_id: reqBody.sectorId,
					sector_num: reqBody.sectorNum,
					count: reqBody.newsNum,
					courier_id: usersObj[reqBody.api_token].user_id
				};

				sql.products.setProduct(prodData, function(error, results, fields){
					if(error)
						res.send(error);
					else 
						res.send('success');	
				});
			}
			else
				res.send('success');
		}
	});
	

});

// sectors api 

app.get('/get/list/sectors', function(req, res){
	var userApi = req.query.api_token;
	sql.sectors.getSectors(function(error, results, fields){
			var sectResults = results;

			if(error){
				res.send(error);
			}
			else{
				sql.products.getProducts(function(error, results, fields){
					if(error){
						res.send(error);
					}
					else {
						var prodResults = results;

						for(var r in sectResults){
							if(sectResults[r].manager_id == usersObj[userApi].user_id || usersObj[userApi].user_type == 1)
								sectResults[r].editable = true;
							else
								sectResults[r].editable = false;

							sectResults[r].coords = JSON.parse(sectResults[r].coords);	
						}

						var sendData = {
							prod_results: prodResults,
							sect_results: sectResults
						};
						res.json(sendData);
					}
				});
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
		else if(results.affectedRows)
			res.send('success');	
		else
			res.send({'message':'fail'});	
	});
});

app.post('/edit/sectors', function(req, res){
	var data = {
		title: req.body.sectorTitle,
		coords: JSON.stringify(req.body.sectorCoords)
	};

	sql.sectors.editSectors(req.body.sectorID, data, function(error, results, fields){
		if(error)
			res.send(error);
		else if(results.changedRows)
			res.send('success');	
		else
			res.send('not found');
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

app.listen(app.get('port'), function(){
	console.log('Running on 5000!');
});
