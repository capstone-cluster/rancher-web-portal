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
});