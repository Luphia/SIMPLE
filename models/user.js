class user {
	constructor(data) {
		var data = data || {};
		this.uid = data.uid;
		this.account = data.account;
		this.password = data.password;
		this.username = data.username;
		this.displayname = "";
		this.gender = "";
		this.photo = "";
		this.email = {address: "", verified: false};
		this.facebook = {id: "", name: "", picture: "", email: ""};
		this.googleplus = {id: "", name: "", picture: "", email: ""};
		this.twitter = {id: "", name: "", picture: "", email: ""};
		this.linkedin = {id: "", name: "", picture: "", email: ""};
		this.status = 1;
		this.ctime = new Date().getTime();
		this.ltime = -1;
	}
	set account(value) {
		this.account = value;
	}
	set password(value) {
		this.password = {hash: "", salt: "", mtime: 0, expire: -1};
	}
	set username(value) {
		this.username = {family: "", given: "", middle: ""};
	}

	import(data) {

	}
	formatDB() {

	}
	formatAPI() {

	}
}

module.exports = user;