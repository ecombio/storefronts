document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.js-newsletter-sms-form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var endpoint = form.getAttribute('data-sms-endpoint');
      var input = form.querySelector('input[name="phone"]');
      var successMsg = form.querySelector('.newsletter-box__message--success');
      var errorMsg = form.querySelector('.newsletter-box__message--error');
      var button = form.querySelector('.newsletter-box__button');

      successMsg.hidden = true;
      errorMsg.hidden = true;

      if (!endpoint) {
        console.warn('Newsletter SMS form: no endpoint configured in section settings.');
        errorMsg.textContent = 'Signup is not configured yet.';
        errorMsg.hidden = false;
        return;
      }

      var originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Submitting…';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: input.value })
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Request failed');
          successMsg.hidden = false;
          form.reset();
        })
        .catch(function () {
          errorMsg.hidden = false;
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = originalText;
        });
    });
  });
});