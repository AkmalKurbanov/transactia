const faqItems = document.querySelectorAll('.faq__item');

faqItems.forEach(item => {
  const desc = item.querySelector('.faq__item-desc');

  item.addEventListener('click', () => {
    const isOpen = item.classList.contains('active');


    faqItems.forEach(other => {
      if (other !== item) {
        other.classList.remove('active');
        const otherDesc = other.querySelector('.faq__item-desc');
        otherDesc.style.maxHeight = '0px';
      }
    });


    if (isOpen) {
      
      desc.style.maxHeight = desc.scrollHeight + 'px';
      requestAnimationFrame(() => {
        desc.style.maxHeight = '0px';
      });
      item.classList.remove('active');

    } else {
   
      item.classList.add('active');
      desc.style.maxHeight = desc.scrollHeight + 'px';
    }
  });
});
