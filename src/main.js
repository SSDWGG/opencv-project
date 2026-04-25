import { createHairTryOnApp } from './app/createHairTryOnApp.js';
import './styles.css';

const app = createHairTryOnApp({
  video: getElement('#camera'),
  canvas: getElement('#stage'),
  startButton: getElement('#startButton'),
  status: getElement('#status'),
  emptyState: getElement('#emptyState'),
  styleButtons: getElement('#styleButtons'),
  colorInput: getElement('#hairColor'),
  opacityInput: getElement('#opacity'),
  privacyToggle: getElement('#privacyToggle'),
  privacyScaleInput: getElement('#privacyScale'),
  eraseHairToggle: getElement('#eraseHairToggle'),
  eraseHairStrengthInput: getElement('#eraseHairStrength'),
  depthToggle: getElement('#depthToggle'),
  debugToggle: getElement('#debugToggle')
});

app.mount();

function getElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}
