module.exports = function (connection) {

	return {
		getSectors: function (callback) {
			connection.query('SELECT * FROM sectors', callback);
		},
		addSectors: function (details, callback) {
			connection.query('INSERT INTO sectors SET ?', details, callback);
		},
		editSectors: function (sectorID, details, callback) {
			connection.query('UPDATE sectors SET ? WHERE id = ?', [details, sectorID], callback);
		},
		removeSectors: function (sectorID, callback) {
			connection.query('DELETE FROM sectors WHERE id = ?', [sectorID], callback);
		}
	}
}