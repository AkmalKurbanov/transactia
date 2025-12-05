import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector('.masonry-grid');
  if (!grid) return;

  const msnry = new Masonry(grid, {
    itemSelector: '.masonry-item',
    columnWidth: '.masonry-sizer',
    gutter: '.gutter-sizer',
    percentPosition: true
  });

  imagesLoaded(grid).on('progress', () => {
    msnry.layout();
  });
});
