(function(){
  'use strict';

  angular
    .module("lily.utils", []) // [] param needed because this is the FIRST lily.utils file listed in catalogue
    .factory("asyncUtils", asyncUtils);

  asyncUtils.$inject = ['$q', '$timeout'];

  function asyncUtils($q, $timeout){

    function rateLimit(items, limit, action) {
        var interval = 1000 / limit;
        var startedActions = [];
        var startTime = Date.now();

        function startFrom(index) {
            if (index < items.length) {
                // keep track of started actions, but don't wait for them to finish yet
                startedActions.push(action(items[index]));
                // just wait for interval, then start the next action
                return $timeout(function () {
                    return startFrom(index + 1);
                }, interval);
            }
            else {
                return $q.when(); // we're done
            }
        }

        // start from 0, wait for all actions to be started, then wait for them all to finish
        return startFrom(0).then(function () {
            return $q.all(startedActions);
        });
    }

    return{
      rateLimit: rateLimit
    };
  }
})();(function(){
  'use strict';

  /**
   * @desc selectionUtils provides the useful function for selecting the html element text
   */
  angular
    .module("lily.utils")
    .factory("selectionUtils", selectionUtils);

  selectionUtils.$inject = ['$document'];

  function selectionUtils($document){
    var documentRef = $document.get(0);
    return{
      isCopyToClipboardSupported: function(){
        try{
          return documentRef.queryCommandSupported("copy") && typeof documentRef.execCommand === "function" ;
        }catch(err){
          //To handle all the security exceptions 
          return false;
        }
      },
      copyToClipboard: function(value){
        if(this.isCopyToClipboardSupported()){
          // TODO add support for element query 
          var isCopied, input = documentRef.createElement("input");
          input.value = value;
          input.className = "lily-hidden-input";
          documentRef.body.appendChild(input);
          input.select();

          try {
            // using the DOM API  - 'execCommand' to copy the selected content.
            // Refer - https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand#Specifications
            isCopied = documentRef.execCommand("copy");
          } catch (err) {
            isCopied = false;
          }
          documentRef.body.removeChild(input);
          return isCopied;
        }
      }
    };
  }

})();(function(){
  'use strict';

  angular
    .module("lily.utils")
    .factory("lilyLocalization", lilyLocalization);

  lilyLocalization.$inject = [];

  function lilyLocalization(name){    

    var localizedStrings = window.localizedStrings;

    function get(name, module){
      var result = "";
      if(module === undefined){
        for(var key in localizedStrings){
          if(localizedStrings[key][name]){
            
            return localizedStrings[key][name];
          }
        }
      }else{
        var moduleStrings = localizedStrings[module];
        result =  moduleStrings ? moduleStrings[name] : "";
      } 
      return result;
    }
    return{
      getString: get
    };
  }
})();window.LilyUtils = window.LilyUtils || {};
window.LilyUtils.toBoolean = function(value) {

    if (_.isBoolean(value)) {
        return value;
    } else if (value === "true") {
        return true;
    } else {
        return false;
    }
};
