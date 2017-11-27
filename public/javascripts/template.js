const socket = io.connect();
var templateForm = $('#template-form');
$(function() {
  // socket.emit('request message time');
  $(document).on('change', '#template-type', switchTemplateType);
  $('.view-button').hide();
  $('.view-carousel').hide();
  $('.view-confirm').hide();
});

function switchTemplateType() {
  let type = $(this).val();
  if( type=="buttons" ) displayButtonView();
  else if( type=="confirm" ) displayConfirmView();
  else if( type=="carousel" ) displayCarouselView();
  else if( type=="image_carousel" ) displayImageCarouselView();
  else console.log("switchTemplateType err");
}
function displayConfirmView() {
  $('.view-button').hide();
  $('.view-carousel').hide();
  $('.view-confirm').show();
}
function displayButtonView() {
  $('.view-carousel').hide();
  $('.view-confirm').hide();
  $('.view-button').show();
}
function displayCarouselView() {
  $('.view-confirm').hide();
  $('.view-button').hide();
  $('.view-carousel').show();
}
function TEXT_FORM(n) {
  let id = "template-text"+n;
  return '<div class="form-group">'
  +'<label for="'+id+'" class="col-2 col-form-label">說明文字: </label>'
  +'<div class="col-4">'
  +'<input class="form-control" type="text" value="" id="'+id+'">'
  +'</div></div>';
}
