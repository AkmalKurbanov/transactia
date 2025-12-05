
import Swiper from 'swiper';
import { Autoplay } from 'swiper/modules';

var swiper = new Swiper(".slider-js", {
  modules: [Autoplay],
  autoplay: {
    delay: 0,
    disableOnInteraction: false,  
    pauseOnMouseEnter: false,
  },
  slidesPerView: "auto",
  spaceBetween: 30,
  loop: true,
  speed: 5000,
  freeMode: true,
  freeModeMomentum: false,
});

