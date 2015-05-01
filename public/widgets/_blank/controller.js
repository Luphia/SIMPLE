'use strict';

angular.module('*** widget name ***', ['angularWidget', 'ngMaterial'])
  .controller('*** widget name ***Ctrl', function ($scope, widgetConfig) {
    $scope.widgetOptions = widgetConfig.getOptions();
  })
  .config( function($mdThemingProvider){

  });
