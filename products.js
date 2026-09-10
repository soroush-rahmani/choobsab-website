// دیتابیس فرضی محصولات و دسته‌بندی‌ها (Mock Database)
const storeData = {
  categories: [
    {
      id: "bowls",
      name: "ظروف چوبی",
      icon: "fas fa-utensils",
      subcategories: [
        {
          id: "bowl-1",
          name: "کاسه چوبی بلوط با لبه طبیعی و خراطی دست",
          link: "#",
          price: 685000,
          woodType: "بلوط",
          finishType: "مات",
          images: [
            "assets/images/bowl-1-front.jfif",
            "assets/images/bowl-1-back.jfif",
            "assets/images/aaa.jpg"
          ],
        },
        {
          id: "bowl-2",
          name: "بشقاب سرو چوبی طرح برگ گردو",
          link: "#",
          price: 780000,
          woodType: "گردو",
          finishType: "نیمه مات",
          images: [
            "assets/images/plate-1-front.jfif",
            "assets/images/plate-1-back.jfif",
          ],
        },
        {
          id: "bowl-3",
          name: "تخته گوشت و سرو مستطیلی راش",
          link: "#",
          price: 620000,
          woodType: "راش",
          finishType: "مات",
          images: [
            "assets/images/serving-1-front.jfif",
            "assets/images/serving-1-back.jfif",
          ],
        },
      ],
    },
    {
      id: "vases",
      name: "گلدان و دکوری",
      icon: "fas fa-seedling",
      subcategories: [
        {
          id: "vase-1",
          name: "گلدان خراطی مینیمال چوب روس",
          link: "#",
          price: 950000,
          woodType: "روس",
          finishType: "سوپر براق",
          images: [
            "assets/images/vase-1-front.jfif",
            "assets/images/vase-1-back.jfif",
          ],
        },
        {
          id: "vase-2",
          name: "شمعدان سنتی خراطی شده گردو",
          link: "#",
          price: 380000,
          woodType: "گردو",
          finishType: "نیمه مات",
          images: [
            "assets/images/candle-1-front.jpg",
            "assets/images/candle-1-back.jpg",
          ],
        },
      ],
    },
    {
      id: "furniture",
      name: "مبلمان ظریف",
      icon: "fas fa-couch",
      subcategories: [
        {
          id: "furn-1",
          name: "میز عسلی سه پایه چوب راش",
          link: "#",
          price: 2400000,
          woodType: "راش",
          finishType: "نیمه مات",
          images: [
            "assets/images/table-1-front.jpg",
            "assets/images/table-1-back.jpg",
          ],
        },
        {
          id: "furn-2",
          name: "شلف دیواری معلق چوب بلوط",
          link: "#",
          price: 890000,
          woodType: "بلوط",
          finishType: "مات",
          images: [
            "assets/images/shelf-1-front.jpg",
            "assets/images/shelf-1-back.jpg",
          ],
        },
      ],
    },
    {
      id: "clocks",
      name: "ساعت‌های چوبی",
      icon: "fas fa-clock",
      subcategories: [
        {
          id: "clock-1",
          name: "ساعت دیواری رگلاژ با حاشیه چوب گردو",
          link: "#",
          price: 1650000,
          woodType: "گردو",
          finishType: "سوپر براق",
          images: [
            "assets/images/wall-clock-1-front.jpg",
            "assets/images/wall-clock-1-back.jpg",
          ],
        },
      ],
    },
    {
      id: "accessories",
      name: "اکسسوری و زیورآلات",
      icon: "fas fa-gem",
      subcategories: [
        {
          id: "acc-1",
          name: "جواهرباکس منبت و خراطی ظریف",
          link: "#",
          price: 550000,
          woodType: "راش",
          finishType: "نیمه مات",
          images: [
            "assets/images/box-1-front.jpg",
            "assets/images/box-1-back.jpg",
          ],
        },
        {
          id: "acc-2",
          name: "پایه موبایل و تبلت چوبی ارگونومیک",
          link: "#",
          price: 290000,
          woodType: "روس",
          finishType: "مات",
          images: [
            "assets/images/stand-1-front.jpg",
            "assets/images/stand-1-back.jpg",
          ],
        },
      ],
    },
  ],
};
