const christmasList = document.getElementById('christmasList');

let item = [
  {
    title: 'Bellroy Tech Kit Compact',
    image: 'img/techkit.png',
    category: 'Tech',
    price: '$55',
    link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
  },
  {
    title: 'Bellroy Tech Kit Compact',
    image: 'img/techkit.png',
    category: 'Tech',
    price: '$55',
    link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
  },
  {
    title: 'Bellroy Tech Kit Compact',
    image: 'img/techkit.png',
    category: 'Tech',
    price: '$55',
    link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
  },
    {
      title: 'Bellroy Tech Kit Compact',
      image: 'img/techkit.png',
      category: 'Tech',
      price: '$55',
      link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
    },
    {
      title: 'Bellroy Tech Kit Compact',
      image: 'img/techkit.png',
      category: 'Tech',
      price: '$55',
      link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
    },
    {
      title: 'Bellroy Tech Kit Compact',
      image: 'img/techkit.png',
      category: 'Tech',
      price: '$55',
      link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
    },
    {
      title: 'Bellroy Tech Kit Compact',
      image: 'img/techkit.png',
      category: 'Tech',
      price: '$55',
      link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
    },
    {
      title: 'Bellroy Tech Kit Compact',
      image: 'img/techkit.png',
      category: 'Tech',
      price: '$55',
      link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
    },
    {
      title: 'Bellroy Tech Kit Compact',
      image: 'img/techkit.png',
      category: 'Tech',
      price: '$55',
      link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
    },
]

for (let i = 0; i < item.length; i++) {
  console.log(item[i]);

  let currentItem = item[i]
  appendNewChristmasListItem(currentItem);
} 

function appendNewChristmasListItem(listItem){
  christmasList.innerHTML += `
    <div class="p-10 pt-5 pb-5 w-70 h-96 bg-[#ffffff] shadow-lg rounded-2xl flex flex-col items-center relative">
      <div class="relative w-56 h-56 border-2 border-black rounded-2xl overflow-hidden flex items-center justify-center">
        <img class="scale-125 hover:scale-110 transition-all duration-75" src="${listItem.image}">
      </div>
      <div class="relative w-full pt-3">
        <div class="flex items-center gap-3">
          <p class="text-sm">${listItem.category}</p>
          <div class="w-6 h-[2px] bg-accent-red"></div>
        </div>
        <h4 class="text-2xl font-bold">${listItem.title}</h4>
      </div>
      <div class="w-full flex items-end">
        <p class="mr-auto text-2xl text-accent-red font-bold">${listItem.price}</p>
        <a class="p-6 hover:p-8 transition-all bg-lighter-black hover:bg-accent-red text-white rounded-ss-3xl rounded-br-lg absolute right-0 bottom-0" href="${listItem.link}"><i class="fa-solid fa-link"></i></a>
      </div>
    </div>
  `;
}