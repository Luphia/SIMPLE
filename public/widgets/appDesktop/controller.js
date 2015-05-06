'use strict';

angular.module('appDesktop', ['angularWidget', 'ngMaterial'])
  .controller('appDesktopCrtl', function ($scope, $mdDialog) {
  	$scope.appList = [{"name": "AppStore"},{"name": "myApp1"}]

  	$scope.openApp = function(appName, ev){
  		switch(appName) {
  			case "AppStore":
  				$scope.openAppStore(ev);
  				break;
  			case "myApp2":
  				break;
  		}
  	}

  	$scope.openAppStore = function (ev){
	 	$mdDialog.show({
	      controller: appStoreCtrl,
	      templateUrl: './widgets/appDesktop/appStore.html',
	      targetEvent: ev,
	    })	
	}
  })

function appStoreCtrl($scope, $mdDialog) {
	$scope.appStoreList = []
  	for(var i=1; i<=50; i++){
  		var appname = "App"+i
  		var desc = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed posuere faucibus efficitur."
  		$scope.appStoreList.push({"name": appname, "desc": desc})	
  	}

  	$scope.inApp = function (app){
  		
  	}

	$scope.hide = function() {
	$mdDialog.hide();
	};
	$scope.cancel = function() {
	$mdDialog.cancel();
	};
	$scope.answer = function(answer) {
	$mdDialog.hide(answer);
	};
}