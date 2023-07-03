import { Slider } from './src/Slider.js';

if (!customElements.get('slide-r')) {
  customElements.define('slide-r', Slider);
}