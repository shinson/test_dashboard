'use strict';

/**
 * @ngdoc overview
 * @name indicativeAssignmentApp
 * @description
 * # indicativeAssignmentApp
 *
 * Main module of the application.
 */
angular
  .module('indicativeAssignmentApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ngLodash',
    'highcharts-ng'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/home.html',
      })
      .when('/data', {
        templateUrl: 'views/data.html',
        controller: 'DataCtrl',
      })
      .otherwise({
        redirectTo: '/'
      });
  });
