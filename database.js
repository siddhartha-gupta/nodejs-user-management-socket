var pg = require('pg'),
	utils = require('./utils.js'),
	client = null,

	initDB = function() {
		var dbUrl = process.env.DATABASE_URL,
			ssl = true;

		if (!dbUrl) {
			dbUrl = 'pg://postgres:password@localhost:5432/usermanagement';
			ssl = false;
		}
		pg.defaults.ssl = ssl;
		pg.connect(dbUrl, function(err, dbCon) {
			console.log('process.env.DATABASE_URL: ', dbUrl);
			if (err) {
				throw err;
			} else {
				console.log('Connected to postgres! Getting schemas...');

				client = dbCon;
				client.query("CREATE TABLE IF NOT EXISTS users(id_member serial, firstname varchar(64), lastname varchar(64), email varchar(255) NOT NULL, phonenumber varchar(20), location varchar(64), timestamp INTEGER DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), PRIMARY KEY (id_member))");

				client.query('CREATE OR REPLACE FUNCTION update_modified_column() RETURNS TRIGGER AS $$ BEGIN NEW.timestamp = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer; RETURN NEW; END; $$ language "plpgsql";');

				client.query('DROP TRIGGER IF EXISTS update_user_modtime ON users;');
				client.query('CREATE TRIGGER update_user_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE  update_modified_column();');
			}
		});
	},

	listRecords = function(orderField, order, limit, callback) {
		var queryText = 'SELECT * FROM users ORDER BY ' + orderField + ' ' + order + ' Limit ' + limit;
		var query = client.query(queryText);

		query.on("row", function(row, result) {
			result.addRow(row);
		});
		query.on("end", function(result) {
			callback(result.rows);
		});
	},

	getSpecificRecord = function(field, value, callback) {
		var queryText = 'SELECT * FROM users WHERE ' + field + ' = $1';
		var query = client.query(queryText, [value], function(err, result) {
			utils.log('result err: ', err);
			if (result && result.rowCount && result.rowCount > 0) {
				callback(true, result.rows);
			} else {
				callback(false);
			}
		});
	},

	insertRecords = function(data, callback) {
		var resp = {};

		getSpecificRecord('email', data.email, function(exist) {
			if (exist) {
				resp = {
					success: false,
					err: 'emailInUse'
				};
			} else {
				resp = {
					success: true
				}
				client.query("INSERT INTO users(firstname, lastname, email, phonenumber, location) values($1, $2, $3, $4, $5)", [data.firstname, data.lastname, data.email, data.phonenumber, data.location]);
			}
			callback(resp);
		});
	},

	updateRecord = function(field, value, data, callback) {
		var resp = {};

		// check if user still exist, in case someone has deleted it
		getSpecificRecord('id_member', data.id_member, function(exist, row) {
			if (!exist) {
				resp = {
					success: false,
					err: 'alreadyDeleted'
				};
				callback(resp);
			} else if (exist && row[0].timestamp !== data.timestamp) {
				resp = {
					success: false,
					err: 'alreadyUpdated'
				};
				callback(resp);
			} else {
				// check if not edited in between
				var queryText = 'UPDATE users set firstname = $1, lastname = $2, location = $3 WHERE ' + field + ' = $4';
				var query = client.query(queryText, [data.firstname, data.lastname, data.location, value], function(err, result) {
					utils.log('result err: ', err);
					if (result && result.rowCount && result.rowCount > 0) {
						resp = {
							success: true
						};
					} else {
						resp = {
							success: false,
							err: 'unknownErr'
						};
					}
				});
			}
		});
	},

	deleteRecord = function(field, value, callback) {
		var queryText = 'DELETE FROM users WHERE ' + field + ' = $1';
		var query = client.query(queryText, [value], function(err, result) {
			utils.log('result err: ', err);

			if (result && result.rowCount && result.rowCount > 0) {
				resp = {
					success: true
				};
			} else {
				resp = {
					success: false,
					err: 'unknownErr'
				};
			}
		});
	},

	deleteMutipleRecords = function(field, value, callback) {
		var params = [];
		for (var i = 1, len = value.length; i <= len; i++) {
			params.push('$' + i);
		}

		var queryText = 'DELETE FROM users WHERE ' + field + ' IN (' + params.join(',') + ')';
		var query = client.query(queryText, value, function(err, result) {
			utils.log('result err: ', err);
			if (result && result.rowCount && result.rowCount > 0) {
				resp = {
					success: true
				};
			} else {
				resp = {
					success: false,
					err: 'unknownErr'
				};
			}
		});
	};

module.exports = {
	initDB: initDB,
	listRecords: listRecords,
	insertRecords: insertRecords,
	updateRecord: updateRecord,
	deleteRecord: deleteRecord,
	deleteMutipleRecords: deleteMutipleRecords
}
