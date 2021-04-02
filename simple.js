const modules = document.getElementsByClassName('ModuleHeaderIcon');

const showPopupForModuleUpdate = () =>{
    console.log('cclickkkkkkkkkkkk')

    $('#myModal').modal('show'); 
}

Array.from(modules).forEach(function(module) {
    module.addEventListener('click', showPopupForModuleUpdate);
});
