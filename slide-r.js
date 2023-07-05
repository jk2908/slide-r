import { Slider } from './src/Slider';

if (!customElements.get('slide-r')) {
  customElements.define('slide-r', Slider);
}