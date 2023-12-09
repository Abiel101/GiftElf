const christmasList = document.getElementById('christmasList');

let item = [
  {
    title: 'BackPack',
    image: 'img/BackPack.jpg',
    category: 'Tech',
    price: '$219',
    link: 'https://alpakagear.com/products/elements-backpack-pro?utm_source=facebook&utm_medium=paid&utm_campaign=US+%7C+Prospecting+%7C+Reels+%26+Whitelist+%28Conversions%29&utm_content=Elements+Backpack+Pro+%7C+NEW+-+SHOP+NOW+-+PDP+-+VIDEO+%7C+Boosted+Reel+-+Studio+-+Packing&utm_term=202309+%7C+Boosted+Reels+%7C+LAL+1-3%25+%28Pixel+%7C+Purchasers%29+%7C+Stories%2C+Reels&fbadid=23861355086650491&fbclid=PAAaY_4LNzZPcTLY6NQFDXOyCCN1p9u2uzN21rVp6CR2VUsRXKPqMTID1HcSg_aem_AZufFoUxbZL3dMvzLgFEGm9G37NvAm-CSNtvOJV5dhOFoTYQNb1TnvgONNDze5BtD4UJDS3ykksWuy3kNKImBSGy&campaign_id=23861354204560491&ad_id=23861355086650491&currency=USD'
  },
  {
    title: 'Bellroy Tech Kit Compact',
    image: 'img/techkit.png',
    category: 'Tech',
    price: '$55',
    link: 'https://www.amazon.com/gp/product/B0B7VNHDTL/ref=ewc_pr_img_13?smid=A3CSAYA4MI36OG&th=1'
  },
  {
    title: 'Nautroom Wooden Cup',
    image: 'img/woodenCup.jpg',
    category: 'Coffee',
    price: '$9.99',
    link: 'https://www.amazon.com/gp/product/B09L8DS2ZB/ref=ox_sc_saved_title_3?smid=A2QJ46M0A3TXWN&psc=1'
  },
  {
    title: 'Logitech Keyboard',
    image: 'img/logitechKeyboard.jpg',
    category: 'Tech',
    price: '$199',
    link: 'https://www.logitechg.com/en-gb/products/gaming-keyboards/pro-x-tkl-wireless-keyboard.html?irclickid=3Mo0lNXVJxyNUjfx-FXaGQhtUkFSmgT%3ACz-2wY0&irgwc=1'
  },
  {
    title: 'Logitech Mouse',
    image: 'img/logitechMouse.jpg',
    category: 'Tech',
    price: '$149',
    link: 'https://www.logitechg.com/en-gb/products/gaming-mice/pro-x2-superlight-wireless-mouse.910-006639.html?irclickid=3Mo0lNXVJxyNUjfx-FXaGQhtUkFSmgQWCz-2wY0&irgwc=1'
  },
  {
    title: 'Pro Core MagSafe',
    image: 'img/',
    category: 'Tech',
    price: '$29',
    link: 'https://rollingsquare.com/collections/edge%C2%AE-pro/products/edgepro-core?utm_source=ig&utm_medium=Instagram_Feed&utm_campaign=%5BAdkings%5D+SALES+%7C+COLD+%7C+US+%7C+OX+%7C+Control+%2B+DTC+%7C+17.10.23.&utm_term=Broad+%7C+US+%7C+CONTROL+2+%7C+14.09.&utm_content=CONTROL+%7C+post+id%3A+574205951591605+%7C+14.09.&fbadid=120200544218570704&fbclid=PAAaZBl4k3y2d5VYqQlj4sEUbGKSc7YJ1jCuuwOICBh-eir3qQeBl1KpEuXwo_aem_AQzGhY9l6CH9UIV0vHMdmE2_yUWzmwxRgftj6WtIeCg0HnCSez0onFeh5nDzu4-xm1yJb4EmpT3iREAaJaDC2c0y&campaign_id=120200544218860704&ad_id=120200544218570704&variant=44836783358271'
  },
  {
    title: 'Clamp-on Desktop Shelf',
    image: 'img/DeskShelves.jpg',
    category: 'Tech',
    price: '$69',
    link: 'https://www.hinomi.co/products/clamp-on-desktop-shelf?fbclid=PAAaaAKqst_hYtV-e1A-r3pFoP4fuaQqBVaVHSx-L-II37FS-6hH7aQjGXWK0_aem_AQygx2zfIl2DIJoiZytabiBSVL0tSaGOKpVFZtdPDsmefQyp5TWarumY2djAKJObuXqB9vd3T1fM4e53AmbaKNnU&utm_source=facebook&utm_medium=paid&campaign_id=120200650126340657&ad_id=120200778295950657'
  },
  {
    title: 'Muscle Milk Protein',
    image: 'img/proteinPoweder.jpg',
    category: 'Protein',
    price: '$26.59',
    link: 'https://www.amazon.com/gp/product/B0B5L4TJX1/ref=ox_sc_saved_title_4?smid=ATVPDKIKX0DER&psc=1'
  },
    {
      title: 'Mu Mo 7 Ounce Cup',
      image: 'img/white_cups.jpg',
      category: 'Coffee',
      price: '$23.98',
      link: 'https://www.amazon.com/gp/product/B0BZS4WQ5N/ref=ox_sc_saved_image_1?smid=AR7OR4R04K75S&psc=1'
    },
    {
      title: 'Epessa Portable Pen Holder',
      image: 'img/penBookHolder.jpg',
      category: 'Journal',
      price: '$9.99',
      link: 'https://www.amazon.com/gp/product/B0878QR7C9/ref=ox_sc_saved_title_2?smid=A2NXX5W5QZ80CV&psc=1'
    },
    {
      title: 'Wacaco Minipresso GR',
      image: 'img/wacacoMiniPresso.jpg',
      category: 'Coffee',
      price: '$54.90',
      link: 'https://www.amazon.com/gp/product/B00VTA9F6U/ref=ox_sc_saved_title_3?smid=AHBV4MH7A6NPG&psc=1'
    },
    {
      title: 'AirLove Retro Brass Bookmark',
      image: 'img/metalBookMark.png',
      category: 'Book',
      price: '$7.99',
      link: 'https://www.amazon.com/dp/B08MW9CNT1?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'Pen Clip for Notebook',
      image: 'img/penHolder.png',
      category: 'Book',
      price: '$8.99',
      link: 'https://www.amazon.com/dp/B09HBNFGFK?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'BenQ LaptopBar Light',
      image: 'img/benQLight.png',
      category: 'Tech',
      price: '$139',
      link: 'https://www.amazon.com/dp/B0C3HFR2JJ?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'Puzzle Exercise Mat',
      image: 'img/matPadding.png',
      category: 'Health',
      price: '$23.09',
      link: 'https://www.amazon.com/dp/B013A4ATCQ?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'JavaPresse Manual Coffee Grinder',
      image: 'img/coffeeGrinder.png',
      category: 'Coffee',
      price: '$37.59',
      link: 'https://www.amazon.com/dp/B013R3Q7B2?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'Kaweco Brass Gel/Ballpoint',
      image: 'img/brassPen.png',
      category: 'Journal',
      price: '$45.50',
      link: 'https://www.amazon.com/dp/B00WHCAKCC?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'Google Pixel Buds Pro',
      image: 'img/googlePixelBuds.png',
      category: 'Tech',
      price: '$118.99',
      link: 'https://www.amazon.com/dp/B0B1N7SGMZ?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'Koopala LED Wall Sconces',
      image: 'img/LED-light.png',
      category: 'Tech',
      price: '$19.99',
      link: 'https://www.amazon.com/dp/B09JKBKYLT?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'Keep Going Book',
      image: 'img/keepgoing.png',
      category: 'Book',
      price: '$9.85',
      link: 'https://www.amazon.com/dp/1523506644?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'Steal Like an Artist',
      image: 'img/stealLikeAnArtist.png',
      category: 'Book',
      price: '$10.99',
      link: 'https://www.amazon.com/dp/0761169253?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
    {
      title: 'Anker USB C Cable',
      image: 'img/anker_cable.png',
      category: 'Tech',
      price: '$15.99',
      link: 'https://www.amazon.com/dp/B09ZL78C5H?psc=1&ref_=cm_sw_r_cp_ud_ct_ZWNFY5Y6VCY4AYYB8B22'
    },
]

for (let i = 0; i < item.length; i++) {
  console.log(item[i]);

  let currentItem = item[i]
  appendNewChristmasListItem(currentItem);
} 

function appendNewChristmasListItem(listItem){
  christmasList.innerHTML += `
    <div class="p-10 pt-5 pb-5 w-70 h-96 bg-[#ffffff] shadow-lg rounded-2xl flex flex-col items-center relative snap-center sm:snap-start">
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