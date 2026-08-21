document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.sofa-section').forEach(initSofaSection);
});

function initSofaSection(section) {
  const mainImages = Array.from(section.querySelectorAll('.sofa-gallery-main-image'));
  const thumbs = Array.from(section.querySelectorAll('.sofa-thumb'));
  const prevBtn = section.querySelector('.sofa-arrow--prev');
  const nextBtn = section.querySelector('.sofa-arrow--next');
  const swatches = Array.from(section.querySelectorAll('.sofa-swatch'));

  let currentIndex = 0;

  function showImage(index) {
    if (!mainImages.length) return;
    currentIndex = (index + mainImages.length) % mainImages.length;

    mainImages.forEach((img, i) => {
      img.classList.toggle('is-active', i === currentIndex);
    });
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('is-active', i === currentIndex);
    });
  }

  prevBtn && prevBtn.addEventListener('click', () => showImage(currentIndex - 1));
  nextBtn && nextBtn.addEventListener('click', () => showImage(currentIndex + 1));

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      showImage(parseInt(thumb.dataset.index, 10));
    });
  });

  // Color swatch selection — updates active state and, if a matching
  // variant exists, swaps the hidden variant id input used by the form.
  swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      swatches.forEach((s) => {
        s.classList.remove('is-active');
        s.setAttribute('aria-checked', 'false');
      });
      swatch.classList.add('is-active');
      swatch.setAttribute('aria-checked', 'true');

      const variantIdInput = section.querySelector('.sofa-variant-id');
      const selectedValue = swatch.dataset.optionValue;
      const matchingImageIndex = mainImages.findIndex((img) =>
        (img.alt || '').toLowerCase().includes(selectedValue.toLowerCase())
      );

      if (matchingImageIndex > -1) {
        showImage(matchingImageIndex);
      }

      // If you're using Shopify's product/variants.js data, wire the
      // variant id swap here, e.g.:
      // variantIdInput.value = findVariantIdForColor(selectedValue);
    });
  });
}
