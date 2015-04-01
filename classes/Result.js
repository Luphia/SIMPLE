/*
 * result: 1 success
 *         0 fail
 *         -1 invalid token
 *         -2 expired token
 */

var result = function(data) { this.init(data); };
result.prototype.init = function(data) {
	data = data || {};
	this.attr = {};

	for(var key in data) {
		this.attr[key] = data[key];
	}
	this.attr.result = data.result || 0;
	this.attr.message = data.message || "";
	this.attr.data = data.data || {};

	return this;
};
result.prototype.response = function(next, rs, msg, data, session) {
	rs && this.setResult(rs);
	msg && this.setMessage(msg);
	data && this.setData(data);
	session && this.setSession(session);
	next();
};
result.prototype.setResult = function(result) {
	this.attr.result = result;
	return true;
};
result.prototype.setMessage = function(message) {
	this.attr.message = message;
	return true;
};
result.prototype.setData = function(data) {
	this.attr.data = data;
	return true;
};
result.prototype.setSession = function(session) {
	this.attr.session = session;
	return true;
};
result.prototype.getSession = function() {
	return this.attr.session;
};
result.prototype.setCost = function(cost) {
	this.attr.cost = cost;
	return true;
}
result.prototype.setCommand = function(path) {
	this.attr.command = path;
	return true;
};
result.prototype.toJSON = function() {
	return {
		command: this.attr.command,
		result: this.attr.result || 0,
		message: this.attr.message || "",
		cost: this.attr.cost,
		data: this.attr.data || {}
	};
};


module.exports = result;