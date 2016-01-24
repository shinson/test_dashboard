'use strict';

/**
 * @ngdoc function
 * @name indicativeAssignmentApp.controller:DataCtrl
 * @description
 * # DataCtrl
 * Controller of the indicativeAssignmentApp
 */
angular.module('indicativeAssignmentApp')
  .controller('DataCtrl', function ($scope, $http, lodash) {
    //Function to get rates of arrays
    function getRate(list, total){
          return lodash.round(list/total*100,2);
    }

    //Function to get keys of defined events
    function getEventKeys(eventData, eventType, keyList ){
        lodash.forEach(eventData, function(value, key){
          if (typeof value[eventType] !== 'undefined' && typeof value[eventType]['date'] !== 'undefined'){
            keyList.push(key);
          }
        });
    }
    

      $scope.mainInfo = [];
      var dupeColors = [];
      var signUpCount = [];
      var viewProfileCount = [];
      var viewItemCount = [];
      var purchaseItemCount = [];
      var convSignUp2Purchase = [];
      var convSignUp2Profile2Purchase = [];
      var convSignUp2Item2Purchase = [];
      var help = [];
    $http.get('https://mockaroo.com/e7995d70/download?count=5000&key=015777f0')
    .success(function(data) {
        

        
        //Model for Table
        $scope.mainInfo = data;


        //User Count
        var UserCount =  data.length;
        $scope.users = UserCount;
        
        //Gender Stats
        var genderStats = lodash.countBy(data, 'gender');
        $scope.women = getRate(genderStats.Female, UserCount);
        $scope.men = getRate(genderStats.Male, UserCount);

        //Unique Colors
        var findColors = lodash.forEach(data, function(value, key){if (typeof value.purchased_item !==   'undefined' && typeof value.purchased_item.color !==   'undefined' ){dupeColors.push(value.purchased_item.color);}});
        $scope.dedupeColors = lodash.uniq(dupeColors).length;
        

        //Event Counts
        var findSignUpCount = getEventKeys(data, 'signed_up', signUpCount);
        $scope.signUp = signUpCount.length;
        
        var findViewProfileCount = getEventKeys(data, 'viewed_profile', viewProfileCount);
        $scope.viewProfile = viewProfileCount.length;
        
        var findViewItemCount = getEventKeys(data,'viewed_item', viewItemCount);
        $scope.viewItem = viewItemCount.length;
        
        var findPurchaseItemCount = getEventKeys(data, 'purchased_item', purchaseItemCount);
        $scope.purchaseItem = purchaseItemCount.length;
        
        //Conversion Rates
        //First find which users the events intersect with and then use that list to go through the date to see date order
        
        //Converstion Rate of Sign up -> Purchase
        var signPurchaseIntersect = lodash.intersection(signUpCount,purchaseItemCount);

        var signUpB4Purchase = lodash.forEach(signPurchaseIntersect, function(key){
          if (new Date(data[key].signed_up.date) < new Date(data[key].purchased_item.date))
            {
              convSignUp2Purchase.push(key);
            }
          });

        $scope.rateSignUp2Purchase = getRate(convSignUp2Purchase.length, UserCount);

        //Converstion Rate of Sign up-> View Profile -> Purchase
        var signProfilePurchaseIntersect = lodash.intersection(signUpCount,purchaseItemCount,viewProfileCount);
        
        var signUpB4ProfileB4Purchase = lodash.forEach(signProfilePurchaseIntersect, function(key){ 
          if(
              new Date(data[key].signed_up.date) < new Date(data[key].viewed_profile.date) && 
              new Date(data[key].viewed_profile.date) < new Date(data[key].purchased_item.date)
            ){
              convSignUp2Profile2Purchase.push(key);
            }
          });

        $scope.rateSignUp2Profile2Purchase = getRate(convSignUp2Profile2Purchase.length, UserCount);

        //Converstion Rate of Sign up-> View Item -> Purchase
        var signViewPurchaseIntersect = lodash.intersection(signUpCount,purchaseItemCount,viewItemCount);

        var signUpB4ItemB4Purchase = lodash.forEach(signViewPurchaseIntersect, function(key){ 
          if(
            new Date(data[key].signed_up.date) < new Date(data[key].viewed_item.date)  && 
            new Date(data[key].viewed_item.date) < new Date(data[key].purchased_item.date)
          ){
                convSignUp2Item2Purchase.push(key);}
          });
        

        $scope.rateSignUp2Item2Purchase = getRate(convSignUp2Item2Purchase.length, UserCount);
        



        //Clean purchased date for graphing. Take out undefined data
        var purchasedOnly = lodash.filter(data, function(value) {return value.purchased_item !==   undefined});
        var purchasedDateOnly = lodash.filter(purchasedOnly, function(value) {return value.purchased_item.date !==   undefined});

        //Return Purchases by Date data
        var purchasedDateCounts =lodash.countBy(purchasedDateOnly, function(value) {return new Date(value.purchased_item.date)});

        //Need to order data by Date in Ascending order
        //Start with making keys strings in date format
        var newDates = lodash.map(lodash.keys(purchasedDateCounts), function(value){ return new Date(value)});
        
        //Sort dates in order and then splice them as strings to make them look clean on graph
        var purchasedKeysOrdered = lodash.map(lodash.sortBy(newDates), function(value){return value.toString();}); //to order values by date
        var purchasedTitle = lodash.map(purchasedKeysOrdered, function(value){return value.slice(4, 15)}); //x-axis for chart in array
        
        //Return series data orderd by linked sorted data array with the counts by date object
        var purchasedValues = lodash.map(purchasedKeysOrdered, function(value){ return purchasedDateCounts[value]}); //values for chart in array
        
        //Column chart
        $scope.columnChart = {
        options: {
        chart: {type: 'column',width: null}},
        series: [{data: purchasedValues, name: 'Items Purchased'}],
        title: {text: 'Purchased Items by Day'},
        xAxis: {categories: purchasedTitle, crosshair: true},
        yAxis: {min: 0,title: {text: 'Count'}},
        loading: false
    }

        var purchasedKeys = purchasedKeysOrdered;//for order dates for data manipulation

        //Create an object of the color groupings and make the key with the date and color to keep track
        var purchasedColorCounts = lodash.countBy(purchasedDateOnly, function(value) {return [new Date(value.purchased_item.date)+"."+value.purchased_item.color]});
      
        //Create an object to begin the building the data series according to Color with an array of each count ordered by date
        //Dates will be used as a place holder in the color's array to ensure the order of the days is kept
        var colorObject = {}; 
        
        var chartColors = lodash.uniq(dupeColors);
        lodash.forEach(chartColors, function(value){
          colorObject[value] = [];
        });
        //Undefined colors will be put under Other
        colorObject['Other'] = [];

        //used to splice color count object
        var colorKey = ''; //Color splice of the object
        var nestArrayIndex = 0; //Index through date of objects key

        //For loop to fill in date array with appropriate value

        lodash.forEach(purchasedColorCounts, function(value, key){
          
          // Gets Color of out of Object's key. Change Undefined to Other
          colorKey = key.slice(key.indexOf('.')+1);
          if(colorKey === "undefined"){colorKey = "Other"};
          
          //Get Date out of Object's key        
          nestArrayIndex = lodash.indexOf(purchasedKeys, key.slice(0,key.indexOf('.')));
          
          //add count to appropriate index of each color's array so that the order is maintained
          colorObject[colorKey][nestArrayIndex] = value;
          
      });
        
        //Fill in missing gaps with 0 in the colors's array by accessing the index of undefined in object's array
        lodash.forEach(colorObject, function(value, key){
          lodash.forEach(value, function(data, index){ 
            if(typeof data ===  'undefined'){
              colorObject[key][index]= 0
            }
          });
        });
        
        
        
        //Changes ColorObject into series format
        //Color of stack = color key name
        var colorSeries=[]
        lodash.forEach(colorObject, function(value,key){
            colorSeries.push({name: key, color: key, data: value});
        });


    //stacked Chart
    $scope.stackedChart = {
          
          title: {text: 'Purchased Items by Day'},
          xAxis: {categories: purchasedTitle},
          yAxis: {min: 0,
              title: {text: 'Count'},
              stackLabels: {
                  enabled: true,
                  style: {display: 'none'}
              }
          },
          options: {
            chart: {type: 'column', width: null},
          plotOptions: {
              column: {
                  stacking: 'normal',
                  dataLabels: {enabled: false,}
              }
          }},
          series: colorSeries
      };

      //Make sure no charts are showing upon load of page
      $scope.showChart=false;
      $scope.showColor=false;

  //Updating data after adding row
  $scope.addRow = function(){
          return $http.get('https://mockaroo.com/e7995d70/download?count=1&key=015777f0')
          .then(function(response) {
            $scope.rowOfData = response.data[0];
            $scope.mainInfo.unshift($scope.rowOfData);
        
            $scope.users = $scope.mainInfo.length;

            genderStats = lodash.countBy($scope.mainInfo, 'gender');
            $scope.women = getRate(genderStats.Female,  $scope.users);
            $scope.men = getRate(genderStats.Male,  $scope.users);

            var findColorsNew = lodash.forEach($scope.mainInfo, function(value, key){if (typeof value.purchased_item !==   'undefined' && typeof value.purchased_item.color !==   'undefined' ){dupeColors.push(value.purchased_item.color);}});
            $scope.dedupeColors = lodash.uniq(dupeColors).length;
        
            var signUpCountNew=[];
            var viewProfileCountNew=[];
            var viewItemCountNew =[];
            var purchaseItemCountNew =[];
            var convSignUp2PurchaseNew = [];
            var convSignUp2Profile2PurchaseNew = [];
            var convSignUp2Item2PurchaseNew = [];
            //Event Counts
            findSignUpCount = getEventKeys($scope.mainInfo, 'signed_up', signUpCountNew);
            $scope.signUp = signUpCountNew.length;
            
            findViewProfileCount = getEventKeys($scope.mainInfo, 'viewed_profile', viewProfileCountNew);
            $scope.viewProfile = viewProfileCountNew.length;
            
            findViewItemCount = getEventKeys($scope.mainInfo,'viewed_item', viewItemCountNew);
            $scope.viewItem = viewItemCountNew.length;
            
            findPurchaseItemCount = getEventKeys($scope.mainInfo, 'purchased_item', purchaseItemCountNew);
            $scope.purchaseItem = purchaseItemCountNew.length;

            //Converstion Rate of Sign up -> Purchase
            signPurchaseIntersect = lodash.intersection(signUpCountNew,purchaseItemCountNew);
            
            signUpB4Purchase = lodash.forEach(signPurchaseIntersect, function(key){
              if (new Date($scope.mainInfo[key].signed_up.date) < new Date($scope.mainInfo[key].purchased_item.date))
              {
              convSignUp2PurchaseNew.push(key);
              }
             });

            $scope.rateSignUp2Purchase = getRate(convSignUp2Purchase.length, UserCount);

            //Converstion Rate of Sign up-> View Profile -> Purchase
            signProfilePurchaseIntersect = lodash.intersection(signUpCountNew,purchaseItemCountNew,viewProfileCountNew);
            
            signUpB4ProfileB4Purchase = lodash.forEach(signProfilePurchaseIntersect, function(key){ 
              if(
                  new Date($scope.mainInfo[key].signed_up.date) < new Date($scope.mainInfo[key].viewed_profile.date) && 
                  new Date($scope.mainInfo[key].viewed_profile.date) < new Date($scope.mainInfo[key].purchased_item.date)
                ){
                  convSignUp2Profile2PurchaseNew.push(key);
                }
              });

            $scope.rateSignUp2Profile2Purchase = getRate(convSignUp2Profile2Purchase.length, UserCount);

            //Converstion Rate of Sign up-> View Item -> Purchase
            signViewPurchaseIntersect = lodash.intersection(signUpCountNew,purchaseItemCountNew,viewItemCountNew);

            signUpB4ItemB4Purchase = lodash.forEach(signViewPurchaseIntersect, function(key){ 
              if(
                new Date($scope.mainInfo[key].signed_up.date) < new Date($scope.mainInfo[key].viewed_item.date)  && 
                new Date($scope.mainInfo[key].viewed_item.date) < new Date($scope.mainInfo[key].purchased_item.date)
              ){
                    convSignUp2Item2PurchaseNew.push(key);}
              });
            

            $scope.rateSignUp2Item2Purchase = getRate(convSignUp2Item2Purchase.length, UserCount);


            //Clean purchased date for graphing. Take out undefined data
        purchasedOnly = lodash.filter($scope.mainInfo, function(value) {return value.purchased_item !==   undefined});
        purchasedDateOnly = lodash.filter(purchasedOnly, function(value) {return value.purchased_item.date !==   undefined});

        //Return Purchases by Date data
        purchasedDateCounts =lodash.countBy(purchasedDateOnly, function(value) {return new Date(value.purchased_item.date)});

        //Need to order data by Date in Ascending order
        //Start with making keys strings in date format
        newDates = lodash.map(lodash.keys(purchasedDateCounts), function(value){ return new Date(value)});
        
        //Sort dates in order and then splice them as strings to make them look clean on graph
        purchasedKeysOrdered = lodash.map(lodash.sortBy(newDates), function(value){return value.toString();}); //to order values by date
        purchasedTitle = lodash.map(purchasedKeysOrdered, function(value){return value.slice(4, 15)}); //x-axis for chart in array
        
        //Return series data orderd by linked sorted data array with the counts by date object
        purchasedValues = lodash.map(purchasedKeysOrdered, function(value){ return purchasedDateCounts[value]}); //values for chart in array
        

              //Column chart
        $scope.columnChart = {
        options: {
        chart: {type: 'column',width: null}},
        series: [{data: purchasedValues, name: 'Items Purchased', color:'#7cb5ec'}],
        title: {text: 'Purchased Items by Day'},
        xAxis: {categories: purchasedTitle, crosshair: true},
        yAxis: {min: 0,title: {text: 'Count'}},
        loading: false
    }

        var purchasedKeys = purchasedKeysOrdered;//for order dates for data manipulation

        //Create an object of the color groupings and make the key with the date and color to keep track
        var purchasedColorCounts = lodash.countBy(purchasedDateOnly, function(value) {return [new Date(value.purchased_item.date)+"."+value.purchased_item.color]});
      
        //Create an object to begin the building the data series according to Color with an array of each count ordered by date
        //Dates will be used as a place holder in the color's array to ensure the order of the days is kept
        var colorObject = {}; 
        
        var chartColors = lodash.uniq(dupeColors);
        lodash.forEach(chartColors, function(value){
          colorObject[value] = [];
        });
        //Undefined colors will be put under Other
        colorObject['Other'] = [];

        //used to splice color count object
        var colorKey = ''; //Color splice of the object
        var nestArrayIndex = 0; //Index through date of objects key

        //For loop to fill in date array with appropriate value

        lodash.forEach(purchasedColorCounts, function(value, key){
          
          // Gets Color of out of Object's key. Change Undefined to Other
          colorKey = key.slice(key.indexOf('.')+1);
          if(colorKey === "undefined"){colorKey = "Other"};
          
          //Get Date out of Object's key        
          nestArrayIndex = lodash.indexOf(purchasedKeys, key.slice(0,key.indexOf('.')));
          
          //add count to appropriate index of each color's array so that the order is maintained
          colorObject[colorKey][nestArrayIndex] = value;
          
      });
        
        //Fill in missing gaps with 0 in the colors's array by accessing the index of undefined in object's array
        lodash.forEach(colorObject, function(value, key){
          lodash.forEach(value, function(data, index){ 
            if(typeof data ===  'undefined'){
              colorObject[key][index]= 0
            }
          });
        });
        
        
        
        //Changes ColorObject into series format
        //Color of stack = color key name
        var colorSeries=[]
        lodash.forEach(colorObject, function(value,key){
            colorSeries.push({name: key, color: key, data: value});
        });


    //stacked Chart
    $scope.stackedChart = {
          
          title: {text: 'Purchased Items by Day'},
          xAxis: {categories: purchasedTitle},
          yAxis: {min: 0,
              title: {text: 'Count'},
              stackLabels: {
                  enabled: true,
                  style: {display: 'none'}
              }
          },
          options: {
            chart: {type: 'column', width: null},
          plotOptions: {
              column: {
                  stacking: 'normal',
                  dataLabels: {enabled: false,}
              }
          }},
          series: colorSeries
      };

              })      
             }    
  })
  .error(function(data, status, headers, config) {
          alert("failure");
        }); 

  });
