import { headerAnimate } from './headerAnimation.js'

const giftElfTitle = document.getElementById('giftElf-title');
const letterG = document.getElementById('letter-g');
const letterE = document.getElementById('letter-e');
const spanDivider = document.getElementById('span-divider');
const christmasTree = document.getElementById('christmasTree');
const introContainer = document.getElementById('intro');
const body = document.getElementById('body');

gsap.fromTo(letterG, 
  {x: 30}, 
  {
    duration: 1,
    x: 0,
    ease: "power2.inOut",
    delay: 0.5
})
gsap.fromTo(letterE, 
  {x: -30}, 
  {
    duration: 1,
    x: 0,
    ease: "power2.inOut",
    delay: 0.5
})

gsap.fromTo(spanDivider, 
  {height: 0}, 
  {
    duration: 1, 
    height:'100%', 
    ease:"power2.inOut"
})
gsap.to(giftElfTitle, {
  duration: 1,
  y: -35,
  ease: "power2.inOut",
})
gsap.fromTo(christmasTree, 
  {y: 300}, 
  {
    duration: 1, 
    y:0, 
    ease: "power1.inOut"
})

gsap.to(intro, {
  duration: 1,
  opacity: 0,
  ease: 'power1.inOut',
  delay: 3
})


setTimeout(displayNone, 5000)

function displayNone(){
  introContainer.style.display = 'none';
  body.classList.remove('overflow-hidden');
  headerAnimate();
}