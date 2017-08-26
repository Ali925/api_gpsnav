module.exports = function (connection, crypto) {

	return {
		getUser: function (creds, callback) {
			var hash = crypto.createHash('sha256');

			hash.update(creds.password);
			var password = hash.digest('hex');
			connection.query('SELECT * FROM users WHERE username = ? and password = ?', [creds.username, password], callback);
		},
		getUserById: function (userid, callback) {
			connection.query('SELECT * FROM users WHERE id = ?', [userid], callback);
		},
		getUsers: function(details, callback){
			if(details.currentUserType == 1)
				connection.query('SELECT * FROM users WHERE usertype = ?', [details.userType], callback);
			else if(details.currentUserType == 2)
				connection.query('SELECT * FROM users WHERE usertype = 3 and manager_id = ?', [details.managerId], callback);	
		},
		addUser: function (details, callback){
			var hash = crypto.createHash('sha256');

			hash.update(details.password);
			details.password = hash.digest('hex');

			connection.query('INSERT INTO users SET ?', details, callback);
		},
		editUser: function(userid, details, callback){
			if(details.password){
				var hash = crypto.createHash('sha256');

				hash.update(details.password);

				details.password = hash.digest('hex');
			}
			

			connection.query('UPDATE users SET ? WHERE id = ?', [details, userid], callback);
		},
		removeUser: function(userid, callback){
			connection.query('DELETE FROM users WHERE id = ?', [userid], callback);
		}
	}
}