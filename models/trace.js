module.exports = function (connection) {

	return {
		getCoords: function (details, callback) {
			connection.query('SELECT * FROM trace WHERE courier_id = ?', [details.courierId], callback);
		},
		setCoord: function (details, callback){
			connection.query('INSERT INTO trace SET ?', details, callback);
		}
	}
}