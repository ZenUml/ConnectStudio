
const showPopupForModuleUpdate = () =>{
    $("#exampleModal").modal();
}

const modules = document.getElementsByClassName('ModuleHeaderIcon');
Array.from(modules).forEach(function(module) {
    module.addEventListener('click', showPopupForModuleUpdate);
});

$("body").popover({
    trigger: "click",
    sanitize: false,
    html: true,
    animation: true,
    selector: '.mypopover',
    container: '#mycontainer',
});

$(document).on("click", '.mypopover', function (event) {
    event.stopPropagation();
});
$(document).on("click", function () {
    $('.mypopover').popover("hide");
});


// $(document).ready(function(){
//     $(".ModuleHeaderIcon").click(function(){
//         console.log('kkkkkkkkkkkkkkkkkkkkkkkkkk');
//         $("#myModal").modal();
//     });
// });
  

// Write all your code above this line. This will reload popup js page in developer tools -> sources when you reload extension from chrome://extensions.
// To avoid executing location.reload(true) in Inspect console to make popup.js appear in developer tools sources
var reload = (function() {
    var executedAlready = false;
    return function() {
        if (!executedAlready) {
            location.reload(true);
            executedAlready = true;
        }
    }
})();
