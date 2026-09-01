import re

with open('src/components/HeroSection.tsx', 'r') as f:
    content = f.read()

# Update slides
slides = r"""const HERO_SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1518182170546-0766de6b682b?auto=format&fit=crop&w=1200&q=80",
    badge: "🔥 Experiencia VIP",
    badgeEn: "🔥 VIP Experience",
    title: "Volcán Arenal & Aguas Termales",
    titleEn: "Arenal Volcano & Hot Springs",
    desc: "Descubre el majestuoso Volcán Arenal. Sumérgete en exclusivas aguas termales y siente la energía pura de la selva tropical de Costa Rica.",
    descEn: "Discover the majestic Arenal Volcano. Immerse yourself in exclusive hot springs and feel the pure energy of the Costa Rican rainforest.",
    price: "$135"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1544436579-247065977995?auto=format&fit=crop&w=1200&q=80",
    badge: "🐒 Favorito de los Viajeros",
    badgeEn: "🐒 Traveler's Favorite",
    title: "Playas de Manuel Antonio",
    titleEn: "Manuel Antonio Beaches",
    desc: "Un paraíso donde la jungla se encuentra con el océano. Nuestro guía experto te mostrará perezosos y monos en su hábitat natural.",
    descEn: "A paradise where the jungle meets the ocean. Our expert guide will show you sloths and monkeys in their natural habitat.",
    price: "$65"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80",
    badge: "🚣 Pura Adrenalina",
    badgeEn: "🚣 Pure Adrenaline",
    title: "Rafting en el Río Pacuare",
    titleEn: "Pacuare River Rafting",
    desc: "Desafía rápidos de clase III y IV en uno de los ríos más escénicos del mundo. Una aventura épica y segura con instructores certificados.",
    descEn: "Brave Class III and IV rapids in one of the most scenic rivers in the world. An epic and safe adventure with certified instructors.",
    price: "$110"
  }
];"""

content = re.sub(r'const HERO_SLIDES = \[.*?\];', slides, content, flags=re.DOTALL)

with open('src/components/HeroSection.tsx', 'w') as f:
    f.write(content)
