const arrow = document.getElementById('arrow');
const arrowContainer = document.getElementById('arrowContainer');

export function headerAnimate(){
  console.log('Header Animation Has Been Called');
  moveUpAnime('.slideIn');
  arrowAnimation()
}

function moveUpAnime(target){
  gsap.fromTo(target, 
    {
      opacity: 0, 
      y: 100,
    }, 
    {
      duration: 1, 
      opacity: 1, 
      y: 0, 
      stagger: 0.2,
      ease: 'power4.inOut'
    }
  )
}

function arrowAnimation(){
  gsap.fromTo(arrow, 
    {
      y: -10,
      opacity: 0,
    }, 
    {
      duration: 1, 
      y: 0,
      opacity: 1,
      repeat: -1,
      ease: "power4.inOut"
    }
  )
}