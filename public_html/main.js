$(document).ready(function () {
  // validate login username field as user types
  $('body').on('keyup', '.typingValidate', function (event) {
    console.log()
    if (event.target.id === 'input_pass_verify') {
      if ($('#input_pass_verify').val() === $('#input_pass').val()) {
        event.target.classList.remove('is-invalid');
        event.target.classList.add('is-valid');
      }
      else {
        event.target.classList.remove('is-valid');
        event.target.classList.add('is-invalid');
      }
    }
    else if (event.target.checkValidity()) {
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
        image: input_image,
        email: input_email,
        pass: input_pass
      })
    }).done(function (data) {
      showAlert('#inputAlertPlaceholder', 'alert-success', `Deploy Success, waiting for URL to be active...`);
      window.setTimeout(function(){ getUrl(input_email, 20) }, 20000); // wait for deployment to be closer to ready
    }).fail(function (data) {
      let errorMsg = data.status + ', ' + data.statusText;
      console.error("Ajax function returned an error");
      console.error(errorMsg);
      showAlert('#inputAlertPlaceholder', 'alert-danger', 'Submit Failed: ' + errorMsg);
    })

    // reset form
    $('#input_email').removeClass('is-valid');
    $('#input_pass').removeClass('is-valid');
    $('#input_pass_verify').removeClass('is-valid');
    $('#inputForm').trigger('reset');
    $($('#inputForm').find('.form-submit-btn')).prop('disabled', true);
  });

  getImages(); // get list of deployable containers from server
});

function getImages() {
  $.ajax({
    url: '/api/images',
    type: 'GET',
    contentType: 'application/json'
  }).done(function (data) {
    //console.log(data);
    data.sort(); // generate sorted copy to operate on

    for (let i = 0; i < data.length; i++) {
      let prefix = data[i].split('-')[0].trim();
      f_data = data.filter(function (str) { return str.indexOf(prefix) !== -1 });
      $('#input_image').append(`<optgroup label="${prefix}">`);
      for (let j = 0; j < f_data.length; j++) {
        let ind = data.indexOf(f_data[j])
        $('#input_image').append(`<option value="${f_data[j]}">&nbsp;&nbsp;&nbsp;&nbsp;${f_data[j]}</option>`);
      }
      $('#input_image').append(`</optgroup>`);
      i += f_data.length - 1;
    }
  }).fail(function (data) {
    let errorMsg = data.status + ', ' + data.statusText;
    console.error("Ajax function returned an error");
    console.error(errorMsg);
    showAlert('#inputAlertPlaceholder', 'alert-danger', 'Failed to get images: ' + errorMsg);
  })
}

function getUrl(email, tries) {
  $.ajax({
    url: '/api/workloadurl',
    type: 'GET',
    contentType: 'application/json',
    data: {
      email: email
    }
  }).done(function (data) {
    showAlert('#inputAlertPlaceholder', 'alert-success', `Deployment is active:&nbsp;<a href="${data}" target="_blank">${data}</a>`);
  }).fail(function (data) {
    if(data.status == '501') { // 501 is used to signify workload not ready
      console.log("Workload not ready...");
      if(tries > 1){
        window.setTimeout(function(){ getUrl(email, tries-1) }, 5000); // re-check every 5s
      }
      else{
        showAlert('#inputAlertPlaceholder', 'alert-warning', `Deployment is taking a long time to be ready, check back at this URL:&nbsp;<a href="${data.responseText}" target="_blank">${data.responseText}</a>`);
      }
    }
    else {
      let errorMsg = data.status + ', ' + data.statusText;
      console.error("Ajax function returned an error");
      console.error(errorMsg);
      showAlert('#inputAlertPlaceholder', 'alert-danger', 'Failed to get workload URL: ' + errorMsg);
    }
  })
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