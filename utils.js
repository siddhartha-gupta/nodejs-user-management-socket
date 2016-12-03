var headers = function() {
		return {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Credentials': false,
			'Access-Control-Allow-Headers': 'Content-Type,X-Requested-With, X-PINGOTHER',
			'Access-Control-Max-Age': 86400,
			'Content-Type': 'application/json',
		};
	},

	log = function(msg) {
		console.log.apply(console, arguments);
	};

module.exports = {
	headers: headers,
	log: log
}
