import { LanguageCode, LocalizedString } from '../types/heritage';

export function tText(item: LocalizedString | undefined, lang: LanguageCode): string {
  if (!item) return '';
  if (lang === 'as' && item.as) return item.as;
  if (lang === 'bn' || lang === 'as') return item.bn || item.en;
  return item.en;
}

export const UI_STRINGS: Record<string, LocalizedString> = {
  brandName: {
    en: 'Roots of Bengal',
    bn: 'রুটস অব বেঙ্গল',
    as: 'ৰুটছ অৱ বেংগল',
  },
  brandTagline: {
    en: 'Rooted in Tradition, Every Piece Tells a Story.',
    bn: 'ঐতিহ্যের শিকড়ে গাঁথা, প্রতিটি সৃষ্টি বলে নিজস্ব গল্প।',
    as: 'পৰম্পৰাৰ শিপাত গঁথা, প্ৰতিটো সৃষ্টিয়ে কয় নিজস্ব কাহিনী।',
  },
  announcementText: {
    en: 'Demonstration Storefront · Complimentary domestic delivery in Bangladesh over ৳3,000 & India over ₹2,500 · Every piece carries its maker’s origin card',
    bn: 'প্রদর্শনী সংস্করণ · বাংলাদেশে ৳৩,০০০ এবং ভারতে ₹২,৫০০-এর উপরে বিনামূল্যে ডেলিভারি · প্রতিটি পণ্যের সাথে কারিগরের পরিচিতি পত্র যুক্ত',
    as: 'প্ৰদৰ্শনী সংস্কৰণ · বাংলাদেশত ৳৩,০০০ আৰু ভাৰতত ₹২,৫০০-ৰ ওপৰত বিনামূলীয়া ডেলিভাৰী · প্ৰতিটো সামগ্ৰীৰ সৈতে শিল্পীৰ পৰিচয় পত্ৰ সংযুক্ত',
  },
  navHome: {
    en: 'Home',
    bn: 'প্রচ্ছদ',
    as: 'মূল পৃষ্ঠা',
  },
  navShop: {
    en: 'Shop Crafts',
    bn: 'শিল্পসম্ভার',
    as: 'শিল্পসম্ভাৰ',
  },
  navArtisans: {
    en: 'Artisans & Communities',
    bn: 'কারিগর ও জনগোষ্ঠী',
    as: 'শিল্পী আৰু জনগোষ্ঠী',
  },
  navStories: {
    en: 'Cultural Journal',
    bn: 'সংস্কৃতি ও কথা',
    as: 'সংস্কৃতি পত্ৰিকা',
  },
  navAbout: {
    en: 'Our Story',
    bn: 'আমাদের কথা',
    as: 'আমাৰ কথা',
  },
  heroKicker: {
    en: 'Living Heritage across West Bengal, East Bengal & Neighboring Lands',
    bn: 'পশ্চিমবঙ্গ, পূর্ববঙ্গ ও পার্শ্ববর্তী জনপদের জীবন্ত ঐতিহ্য',
    as: 'পশ্চিমবংগ, পূৰ্ববংগ আৰু চুবুৰীয়া জনপদৰ জীৱন্ত ঐতিহ্য',
  },
  heroHeadline: {
    en: 'Every Piece Holds a Story.',
    bn: 'প্রতিটি বুনন ও মাটির ছোঁয়ায় লুকিয়ে আছে এক একটি গল্প।',
    as: 'প্ৰতিটো বয়ন আৰু মাটিৰ স্পৰ্শত লুকাই আছে একোটা কাহিনী।',
  },
  heroSubheadline: {
    en: 'Discover the living traditions of Bengal through handmade treasures, everyday heritage, and the artisans and indigenous communities who keep these traditions alive.',
    bn: 'নকশিকাঁথা, জামদানি, পোড়ামাটি, বেত-বাঁশ এবং আদিবাসী ও গ্রামীণ কারিগরদের হাতে গড়া নিত্যদিনের ঐতিহ্যের মধ্য দিয়ে বাংলার আবহমান সংস্কৃতিকে নতুন করে আবিষ্কার করুন।',
    as: 'নকশিকাঁথা, জামদানী, পোৰামাটি, বেত-বাঁহ আৰু খিলঞ্জীয়া তথা গ্ৰাম্য শিল্পীসকলৰ হাতেৰে গঢ়া নিত্যব্যৱহাৰ্য ঐতিহ্যৰ জৰিয়তে বংগৰ সংস্কৃতিক আৱিষ্কাৰ কৰক।',
  },
  ctaExploreCollection: {
    en: 'Explore the Collection',
    bn: 'সংগ্রহ দেখুন',
    as: 'সংগ্ৰহ চাওক',
  },
  ctaDiscoverStories: {
    en: 'Discover Our Stories',
    bn: 'ঐতিহ্যের গল্প পড়ুন',
    as: 'ঐতিহ্যৰ কাহিনী পঢ়ক',
  },
  searchPlaceholder: {
    en: 'Search Jamdani, Nakshi Kantha, Dhamrai clay, Chakma weave, Ektara...',
    bn: 'জামদানি, নকশিকাঁথা, ধামরাই মাটি, চাকমা বুনন বা একতারা খুঁজুন...',
    as: 'জামদানী, নকশিকাঁথা, মাটিৰ শিল্প বা একতাৰা বিচাৰক...',
  },
  bagLabel: {
    en: 'Bag',
    bn: 'ঝুলি',
    as: 'টোপোলা',
  },
  wishlistLabel: {
    en: 'Saved',
    bn: 'পছন্দ',
    as: 'পছন্দ',
  },
  addToBag: {
    en: 'Add to Bag',
    bn: 'ঝুলিতে রাখুন',
    as: 'টোপোলাত যোগ কৰক',
  },
  quickPreview: {
    en: 'Quick View',
    bn: 'সংক্ষিপ্ত দেখুন',
    as: 'চমু আভাস',
  },
  demoDataNotice: {
    en: 'Demonstration Data — Sample maker profiles, prices, and inventory for frontend evaluation.',
    bn: 'প্রদর্শনী তথ্য — কারিগর পরিচিতি, মূল্য ও মজুদ শুধুমাত্র ফ্রন্টএন্ড প্রদর্শনের জন্য।',
    as: 'প্ৰদৰ্শনী তথ্য — শিল্পীৰ পৰিচয়, মূল্য আৰু মজুত কেৱল ফ্ৰণ্টএণ্ড মূল্যাংকনৰ বাবে।',
  },
  marketBangladesh: {
    en: 'Bangladesh (৳ BDT)',
    bn: 'বাংলাদেশ (৳ টাকা)',
    as: 'বাংলাদেশ (৳ টকা)',
  },
  marketIndia: {
    en: 'India (₹ INR)',
    bn: 'ভারত (₹ রুপি)',
    as: 'ভাৰত (₹ টকা)',
  },
  marketInternational: {
    en: 'International Diaspora (৳ / ₹ Preview)',
    bn: 'আন্তর্জাতিক প্রবাসী (৳ / ₹ প্রাকদর্শন)',
    as: 'আন্তঃৰাষ্ট্ৰীয় প্ৰবাসী (৳ / ₹ পূৰ্বদৰ্শন)',
  },
};
