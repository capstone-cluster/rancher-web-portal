$(document).ready(function () {
  // validate login username field as user types
  $('body').on('keyup', '.typingValidate', function (event) {
    if (event.target.checkValidity()) {
      event.target.classList.remove('is-invalid');
      event.target.classList.add('is-valid');
    } else {
      event.target.classList.remove('is-valid');
      event.target.classList.add('is-invalid');
    }

    // loop over other input fields in the same form
    // enable submit button if other fields are valid
    let $this = $(this);
    let formIsValid = true;
    $($this.parents('form').find('input')).each(function () {
      formIsValid = formIsValid && $(this).hasClass('is-valid');
    });

    // check to see if form has disabled submit button inside form block
    if ($($this.parents('form').find('.form-submit-btn')) != null) {
      $($this.parents('form').find('.form-submit-btn')).prop('disabled', !formIsValid);
    }
  });

  $('#inputForm').submit(function (e) {
    e.preventDefault();
    if ($($('#inputForm').find('.form-submit-btn')).hasClass('disabled')) {
      e.stopPropagation();
      return;
    }

    let input_image = $('#input_image').val();
    let input_email = $('#input_email').val();
    let input_pass = $('#input_pass').val();

    console.log(input_image);
    console.log(input_email);
    console.log(input_pass);

    // reset form
    $('#input_email').removeClass('is-valid');
    $('#input_pass').removeClass('is-valid');
    $('#inputForm').trigger('reset');
    $($('#inputForm').find('.form-submit-btn')).prop('disabled', true);
  });

  getImages(); // get list of deployable containers from server
});

function getImages(){
  $.ajax({ 
    url: '/api/images', 
    type: 'GET', 
    contentType: 'application/json' 
  }).done(function (data) { 
    console.log(data);
    for(i=0; i<data.length; i++){
      $('#input_image').append(`<option value="${i}">${data[i]}</option>`);
    }
  });
}