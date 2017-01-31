var Model = class {
	constructor(code) {
		var rs;
		var code = new String(code);
		if(code.length < 5) {
			var fill = 6 - code.length;
			code = new Array(fill).join('0') + code;
		}
		if(Model.CODE[code]) {
			rs = new Error(Model.CODE[code]);
			rs.code = code;
		}
		else {
			code = '00000';
			rs = new Error(Model.CODE[code]);
			rs.code = code;
		}
		return rs
	}
};
Model.CODE = {
	'00000': 'unknown exception',
	'00001': 'timeout',
	'00002': 'command not found',
	'01001': 'DB write error',
	'01002': 'DB read error',
	'01003': 'DB update error',
	'01004': 'DB delete error',
	'10101': 'invalid hashcash',
	'10201': 'invalid token',
	'10301': 'invalid verify code',
	'12001': 'invalid email',
	'19101': 'incorrect account/password',
	'19102': 'invalid user data',
	'19103': 'incorrect old password',
	'19104': 'incorrect reset code',
	'22001': 'occupied email',
	'29101': 'duplicate user data',
	'39101': 'register data not found',
	'39102': 'user not found',
	'42001': 'email quota exceeded',
	'40301': 'verification failed too many times',
	'49101': 'login failed too many times',
	'49102': 'reset failed too many times',
	'70201': 'Overdue token'
};

module.exports = Model;