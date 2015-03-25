/*
 * result: 1 success
 *         0 fail
 *         -1 invalid token
 *         -2 expired token
 */

module.exports = function() {
	var _init = function() {
		this.result = 0;
		this.message = "";
		this.data = {};
		return this;
	}

	, response = function(next, _rs, _msg, _data) {
		_rs && this.setResult(_rs);
		_msg && this.setMessage(_msg);
		_data && this.setData(_data);
		next();
	}

	, setResult = function(_result) {
		this.result = _result;
		return true;
	}

	, setMessage = function(_message) {
		this.message = _message;
		return true;
	}

	, setData = function(_data) {
		this.data = _data;
		return true;
	}

	, setCost = function(_cost) {
		this.cost = _cost;
		return true;
	}

	, setCommand = function(_path) {
		this.command = _path;
		return true
	}

	, toJSON = function() {
		return {
			command: this.command,
			result: this.result || 0,
			message: this.message || "",
			cost: this.cost,
			data: this.data || {}
		};
	}

	, that = {
		_init: _init,
		response: response,
		setCommand: setCommand,
		setResult: setResult,
		setMessage: setMessage,
		setData: setData,
		setCost: setCost,
		toJSON: toJSON
	};

	return that._init();
}