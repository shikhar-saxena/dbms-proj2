

$(document).ready(function(){
    // Add minus icon for collapse element which is open by default
    $(".collapse.show").each(function(){
        $(this).prev(".panel-heading").find(".fa").addClass("fa-minus-square").removeClass("fa-plus-square");
    });
    
    // Toggle plus minus icon on show hide of collapse element
    $(".collapse").on('show.bs.collapse', function(){
        $(this).prev(".panel-heading").find(".fa").removeClass("fa-plus-square").addClass("fa-minus-square");
    }).on('hide.bs.collapse', function(){
        $(this).prev(".panel-heading").find(".fa").removeClass("fa-minus-square").addClass("fa-plus-square");
    });
});

$(window).on('load', function() {
    if ($('#preloader').length) {
      $('#preloader').delay(100).fadeOut('slow', function() {
        $(this).remove();
      });
    }
  });
