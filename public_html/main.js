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

    $.ajax({
      url: '/api/deploy',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        image : input_image,
        email : input_email,
        pass : input_pass
      })
    })
    .done(function(data) {
      showAlert('#inputAlertPlaceholder', 'alert-success', `Deploy Success:&nbsp;<a href="${data}" target="_blank">${data}</a>
        <br>Please allow a minute for it to be live`);
    })
    .fail(function(data) {
      let errorMsg = data.status + ' ' + data.statusText;
      console.error("Ajax function returned an error");
      console.error(errorMsg);
      showAlert('#inputAlertPlaceholder', 'alert-danger', 'Submit Failed: ' + errorMsg);
    })

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
    //console.log(data);
    let sorted = [...data];
    sorted.sort(); // generate sorted copy to operate on

    for(let i=0; i<sorted.length; i++){
      let prefix = sorted[i].split('-')[0].trim();
      f_data = sorted.filter(function(str){return str.indexOf(prefix) !== -1});
      $('#input_image').append(`<optgroup label="${prefix}">`);
      for(let j=0; j < f_data.length; j++){
        let ind = data.indexOf(f_data[j])
        $('#input_image').append(`<option value="${ind}">&nbsp;&nbsp;&nbsp;&nbsp;${f_data[j]}</option>`);
      }
      $('#input_image').append(`</optgroup>`);
      i += f_data.length-1;
    }
  });
}

function showAlert(selector, alertClass, message) {
  $(selector).hide();
  $(selector).html(`<div class='alert alert-dismissable ` + alertClass + `' role='alert'>
  <span>` + message + `</span>
  <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
  <span aria-hidden='true'>&times</span>
  </button>
  </div>`);
  $(selector).slideToggle(400);
}