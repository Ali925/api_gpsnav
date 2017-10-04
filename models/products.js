module.exports = function (connection) {

	return {
		getProducts: function (callback) {
			connection.query('SELECT * FROM products', callback);
		},
		setProduct: function (details, callback){
			connection.query('INSERT INTO products SET ?', details, callback);
		}
	}
}