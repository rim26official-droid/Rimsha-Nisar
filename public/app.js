document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('load-images');
  const container = document.getElementById('images-container');

  const IMAGES = [
    '/images/img1.jpg',
    '/images/img2.jpg',
    '/images/img3.jpg',
    '/images/img4.jpg',
    '/images/img5.jpg',
  ];

  button.addEventListener('click', () => {
    container.innerHTML = '';
    IMAGES.forEach((src) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = src;
      container.appendChild(img);
    });
  });
});
