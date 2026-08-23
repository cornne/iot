// DỮ LIỆU CỐ ĐỊNH (PRESETS)
  // Preset Profiles & Products
  const PRESET_PROFILES = {
    seafood: ['tôm', 'cua', 'mực', 'nghêu', 'cá biển', 'crustacean'],
    lactose: ['sữa', 'whey', 'phô mai', 'bơ', 'lactose', 'dairy'],
    peanut: ['đậu phụng', 'lạc', 'peanut', 'dầu đậu phụng'],
    gluten: ['lúa mì', 'bột mì', 'gluten', 'mạch nha', 'lúa mạch']
  };

  const PRESET_PRODUCTS = {
    'milk-cookies': {
      name: 'Bánh Quy Bơ Sữa',
      ingredients: 'Bột mì, đường tinh luyện, sữa bột nguyên kem (3.5%), đạm whey, trứng gà, chất nhũ hóa (322i lecithin đậu nành), hương vani tổng hợp.'
    },
    'seafood-noodle': {
      name: 'Mì Tôm Hùm Cay',
      ingredients: 'Bột mì, dầu cọ, bột tôm hùm, chiết xuất nghêu, đạm đậu nành, hành lá sấy, ớt chiết xuất, muối tinh.'
    },
    'yogurt-fruit': {
      name: 'Sữa Chua Phô Mai',
      ingredients: 'Sữa tươi nguyên chất (85%), phô mai cream, men sữa chua, đường, siro xoài tươi, hương liệu tổng hợp.'
    },
    'sausage-soy': {
      name: 'Xúc Xích Đậu Nành',
      ingredients: 'Thịt heo, đạm đậu nành isolate, tinh bột sắn, đường, muối, chất điều vị (621), natri nitrit.'
    }
  };

  // ============================================================================
  // 🧬 CƠ SỞ DỮ LIỆU GỢI Ý CHUẨN FOODON ONTOLOGY (FOODON SUGGESTION DATABASE)
  // ============================================================================
  const FOODON_SUGGESTIONS_DB = [
    // 🥛 SỮA & CHẾ PHẨM TỪ SỮA (Milk & Dairy - FOODON_00001005)
    { id: 'FOODON_00001005', name: 'Sữa (Milk / Dairy)', label: 'Milk product', icon: '🥛', category: 'sữa', group: 'Sữa & Chế phẩm từ Sữa' },
    { id: 'FOODON_03301405', name: 'Đạm Whey (Whey Protein)', label: 'Dairy derivative', icon: '🥛', category: 'sữa', group: 'Dẫn xuất Sữa' },
    { id: 'FOODON_00001145', name: 'Casein / Sodium Caseinate', label: 'Milk protein', icon: '🥛', category: 'sữa', group: 'Đạm Sữa' },
    { id: 'FOODON_03301409', name: 'Lactose (Đường Sữa)', label: 'Milk sugar', icon: '🥛', category: 'sữa', group: 'Đường Sữa' },
    { id: 'FOODON_00001274', name: 'Phô Mai (Cheese)', label: 'Fermented dairy', icon: '🧀', category: 'sữa', group: 'Chế phẩm Sữa' },
    { id: 'FOODON_00001009', name: 'Bơ (Butter / Ghee)', label: 'Dairy fat', icon: '🧈', category: 'sữa', group: 'Chất béo Sữa' },
    { id: 'FOODON_00001275', name: 'Sữa Chua (Yogurt)', label: 'Cultured milk', icon: '🥛', category: 'sữa', group: 'Sữa lên men' },
    { id: 'FOODON_03301412', name: 'Váng Sữa (Milk Cream)', label: 'Dairy cream', icon: '🥛', category: 'sữa', group: 'Chế phẩm Sữa' },
    { id: 'FOODON_03301415', name: 'Sữa Bột (Milk Powder)', label: 'Dry milk', icon: '🥛', category: 'sữa', group: 'Sữa chế biến' },
    { id: 'FOODON_03301418', name: 'Sữa Đặc (Condensed Milk)', label: 'Concentrated milk', icon: '🥛', category: 'sữa', group: 'Sữa đặc' },

    // 🦐 TÔM & GIÁP XÁC (Shrimp & Crustaceans - FOODON_00001254)
    { id: 'FOODON_00001254', name: 'Tôm (Shrimp / Prawn)', label: 'Crustacean', icon: '🦐', category: 'tôm', group: 'Giáp xác' },
    { id: 'FOODON_00001264', name: 'Cua / Ghẹ (Crab)', label: 'Crustacean', icon: '🦀', category: 'tôm', group: 'Giáp xác' },
    { id: 'FOODON_03301255', name: 'Tôm Hùm (Lobster)', label: 'Crustacean', icon: '🦞', category: 'tôm', group: 'Giáp xác' },
    { id: 'FOODON_03301258', name: 'Tép / Tôm Khô (Dried Shrimp)', label: 'Crustacean product', icon: '🦐', category: 'tôm', group: 'Chế phẩm Tôm' },
    { id: 'FOODON_03301260', name: 'Mắm Tôm / Mắm Ruốc (Shrimp Paste)', label: 'Fermented crustacean', icon: '🦐', category: 'tôm', group: 'Mắm truyền thống' },
    { id: 'FOODON_03301262', name: 'Tropomyosin / Glucosamine', label: 'Crustacean allergen', icon: '🧪', category: 'tôm', group: 'Kháng nguyên Giáp xác' },

    // 🐟 HẢI SẢN & THÂN MỀM (Seafood & Molluscs - FOODON_00001256)
    { id: 'FOODON_00001256', name: 'Hải Sản (Seafood)', label: 'Seafood general', icon: '🦞', category: 'hải sản', group: 'Hải sản chung' },
    { id: 'FOODON_00001258', name: 'Mực (Squid / Calamari)', label: 'Mollusc', icon: '🦑', category: 'hải sản', group: 'Thân mềm' },
    { id: 'FOODON_00001259', name: 'Bạch Tuộc (Octopus)', label: 'Mollusc', icon: '🐙', category: 'hải sản', group: 'Thân mềm' },
    { id: 'FOODON_00001261', name: 'Nghêu / Sò / Hàu (Clam / Oyster)', label: 'Bivalve mollusc', icon: '🦪', category: 'hải sản', group: 'Động vật hai mảnh vỏ' },
    { id: 'FOODON_03301265', name: 'Sò Điệp (Scallop)', label: 'Bivalve', icon: '🦪', category: 'hải sản', group: 'Thân mềm' },
    { id: 'FOODON_03301268', name: 'Ốc (Snail / Escargot)', label: 'Gastropod', icon: '🐌', category: 'hải sản', group: 'Thân mềm' },
    { id: 'FOODON_03301270', name: 'Bào Ngư (Abalone)', label: 'Mollusc', icon: '🦪', category: 'hải sản', group: 'Thân mềm cao cấp' },

    // 🐟 CÁ (Fish - FOODON_00001248)
    { id: 'FOODON_00001248', name: 'Cá (Fish / Fish products)', label: 'Fish general', icon: '🐟', category: 'cá', group: 'Cá' },
    { id: 'FOODON_00001249', name: 'Cá Hồi (Salmon)', label: 'Salmonid fish', icon: '🐟', category: 'cá', group: 'Cá biển' },
    { id: 'FOODON_00001250', name: 'Cá Ngừ (Tuna)', label: 'Pelagic fish', icon: '🐟', category: 'cá', group: 'Cá biển' },
    { id: 'FOODON_00001251', name: 'Cá Thu (Mackerel)', label: 'Scombroid fish', icon: '🐟', category: 'cá', group: 'Cá biển' },
    { id: 'FOODON_00001252', name: 'Cá Tuyết (Cod)', label: 'White fish', icon: '🐟', category: 'cá', group: 'Cá biển' },
    { id: 'FOODON_03301250', name: 'Nước Mắm (Fish Sauce)', label: 'Fermented fish', icon: '🏺', category: 'cá', group: 'Gia vị Cá' },
    { id: 'FOODON_03301252', name: 'Dầu Cá (Fish Oil)', label: 'Fish extract', icon: '💊', category: 'cá', group: 'Dầu Cá' },
    { id: 'FOODON_03301255', name: 'Parvalbumin', label: 'Major fish allergen', icon: '🧪', category: 'cá', group: 'Kháng nguyên Cá' },

    // 🥜 ĐẬU PHỘNG / LẠC (Peanuts - FOODON_00001088)
    { id: 'FOODON_00001088', name: 'Đậu Phộng / Lạc (Peanuts)', label: 'Legume nut', icon: '🥜', category: 'đậu phộng', group: 'Đậu phộng' },
    { id: 'FOODON_03301089', name: 'Bơ Đậu Phộng (Peanut Butter)', label: 'Peanut paste', icon: '🥜', category: 'đậu phộng', group: 'Chế phẩm Đậu phộng' },
    { id: 'FOODON_03301090', name: 'Dầu Lạc / Dầu Đậu Phộng (Arachis Oil)', label: 'Peanut oil', icon: '🛢️', category: 'đậu phộng', group: 'Dầu thực vật' },
    { id: 'FOODON_03301092', name: 'Bột Đậu Phộng (Peanut Flour)', label: 'Peanut protein', icon: '🥜', category: 'đậu phộng', group: 'Bột thực phẩm' },

    // 🌱 ĐẬU NÀNH (Soybean & Soy - FOODON_00001099)
    { id: 'FOODON_00001099', name: 'Đậu Nành / Đậu Tương (Soybean)', label: 'Legume', icon: '🌱', category: 'đậu nành', group: 'Đậu nành' },
    { id: 'FOODON_03301100', name: 'Đậu Hũ / Đậu Phụ (Tofu)', label: 'Soy curd', icon: '🧈', category: 'đậu nành', group: 'Chế phẩm Đậu nành' },
    { id: 'FOODON_03301102', name: 'Đạm Đậu Nành Isolate / TVP (Soy Protein)', label: 'Soy protein isolate', icon: '🌱', category: 'đậu nành', group: 'Đạm thực vật' },
    { id: 'FOODON_03301105', name: 'Lecithin Đậu Nành (Soy Lecithin - E322)', label: 'Emulsifier (E322)', icon: '🧪', category: 'đậu nành', group: 'Chất nhũ hóa' },
    { id: 'FOODON_03301108', name: 'Nước Tương / Xì Dầu (Soy Sauce)', label: 'Fermented soy', icon: '🍶', category: 'đậu nành', group: 'Gia vị Đậu nành' },
    { id: 'FOODON_03301110', name: 'Miso / Natto / Tempeh', label: 'Fermented soybean', icon: '🌱', category: 'đậu nành', group: 'Đậu nành lên men' },
    { id: 'FOODON_03301112', name: 'Dầu Đậu Nành (Soybean Oil)', label: 'Soy oil', icon: '🛢️', category: 'đậu nành', group: 'Dầu thực vật' },

    // 🥚 TRỨNG (Egg & Egg Products - FOODON_00001012)
    { id: 'FOODON_00001012', name: 'Trứng (Egg / Egg products)', label: 'Poultry egg', icon: '🥚', category: 'trứng', group: 'Trứng' },
    { id: 'FOODON_03301013', name: 'Lòng Đỏ Trứng (Egg Yolk)', label: 'Egg yolk', icon: '🍳', category: 'trứng', group: 'Lòng đỏ' },
    { id: 'FOODON_03301014', name: 'Lòng Trắng Trứng (Egg White)', label: 'Egg albumen', icon: '🥚', category: 'trứng', group: 'Lòng trắng' },
    { id: 'FOODON_03301016', name: 'Ovalbumin / Ovomucin / Vitellin', label: 'Major egg allergen', icon: '🧪', category: 'trứng', group: 'Đạm Trứng' },
    { id: 'FOODON_03301018', name: 'Lysozyme (Chất bảo quản E1105)', label: 'Egg enzyme (E1105)', icon: '🧪', category: 'trứng', group: 'Phụ gia từ Trứng' },
    { id: 'FOODON_03301020', name: 'Sốt Mayonnaise', label: 'Egg emulsion', icon: '🥣', category: 'trứng', group: 'Sốt Trứng' },

    // 🌾 LÚA MÌ & GLUTEN (Wheat & Gluten Grains - FOODON_00001062)
    { id: 'FOODON_00001062', name: 'Lúa Mì / Bột Mì (Wheat Flour)', label: 'Cereal grain', icon: '🌾', category: 'bột mì', group: 'Lúa mì' },
    { id: 'FOODON_03301063', name: 'Gluten / Gliadin', label: 'Wheat protein', icon: '🌾', category: 'bột mì', group: 'Đạm Gluten' },
    { id: 'FOODON_00001064', name: 'Lúa Mạch (Barley / Hordein)', label: 'Cereal grain', icon: '🌾', category: 'bột mì', group: 'Ngũ cốc có Gluten' },
    { id: 'FOODON_00001066', name: 'Yến Mạch (Oats / Oatmeal)', label: 'Oat grain', icon: '🥣', category: 'bột mì', group: 'Yến mạch' },
    { id: 'FOODON_00001068', name: 'Lúa Mạch Đen (Rye / Secalin)', label: 'Cereal grain', icon: '🌾', category: 'bột mì', group: 'Ngũ cốc' },
    { id: 'FOODON_03301070', name: 'Mạch Nha / Chiết Xuất Malt (Malt Extract)', label: 'Barley malt', icon: '🍯', category: 'bột mì', group: 'Chiết xuất Mạch nha' },
    { id: 'FOODON_03301072', name: 'Mì Sợi / Bánh Mì (Noodles / Bread)', label: 'Wheat food', icon: '🍞', category: 'bột mì', group: 'Thực phẩm Lúa mì' },

    // 🌰 HẠT CÂY DINH DƯỠNG (Tree Nuts - FOODON_00001140)
    { id: 'FOODON_00001140', name: 'Hạt Cây Dinh Dưỡng (Tree Nuts)', label: 'Tree nuts general', icon: '🌰', category: 'hạt', group: 'Hạt cây' },
    { id: 'FOODON_00001180', name: 'Hạnh Nhân (Almond)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001185', name: 'Hạt Óc Chó (Walnut)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001183', name: 'Hạt Điều (Cashew)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001188', name: 'Hạt Dẻ Cười (Pistachio)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001190', name: 'Hạt Mắc Ca (Macadamia)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001187', name: 'Hạt Phỉ (Hazelnut)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001186', name: 'Hạt Hồ Đào (Pecan)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001182', name: 'Hạt Dẻ (Chestnut)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001192', name: 'Hạt Thông (Pine Nut)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },

    // 🌿 MÈ / VỪNG (Sesame Seeds - FOODON_00001174)
    { id: 'FOODON_00001174', name: 'Mè / Vừng (Sesame Seeds)', label: 'Oilseed', icon: '🌿', category: 'mè', group: 'Hạt mè' },
    { id: 'FOODON_03301175', name: 'Dầu Mè / Dầu Vừng (Sesame Oil)', label: 'Sesame oil', icon: '🛢️', category: 'mè', group: 'Dầu Mè' },
    { id: 'FOODON_03301178', name: 'Sốt Tahini / Bơ Vừng (Tahini Paste)', label: 'Sesame paste', icon: '🥣', category: 'mè', group: 'Chế phẩm Mè' },

    // 🥬 CẦN TÂY (Celery - FOODON_00001220)
    { id: 'FOODON_00001220', name: 'Cần Tây (Celery / Celeriac)', label: 'Vegetable allergen', icon: '🥬', category: 'cần tây', group: 'Cần tây' },

    // 🟡 MÙ TẠT (Mustard - FOODON_00001215)
    { id: 'FOODON_00001215', name: 'Mù Tạt (Mustard / Wasabi)', label: 'Spice allergen', icon: '🟡', category: 'mù tạt', group: 'Mù tạt' },

    // 🍗 THỊT GÀ & GIA CẦM (Chicken & Poultry - FOODON_00001015)
    { id: 'FOODON_00001015', name: 'Thịt Gà / Gà (Chicken / Poultry)', label: 'Chicken food product', icon: '🍗', category: 'gà', group: 'Thịt gia cầm' },
    { id: 'FOODON_03301017', name: 'Ức Gà / Phi Lê Gà (Chicken Breast)', label: 'Poultry cut', icon: '🍗', category: 'gà', group: 'Thịt gia cầm' },
    { id: 'FOODON_03301019', name: 'Bột Thịt Gà / Nước Cốt Gà (Chicken Extract)', label: 'Poultry derivative', icon: '🍲', category: 'gà', group: 'Chiết xuất gia cầm' },

    // 🥩 THỊT BÒ (Beef - FOODON_00001025)
    { id: 'FOODON_00001025', name: 'Thịt Bò (Beef)', label: 'Bovine meat', icon: '🥩', category: 'bò', group: 'Thịt đỏ' },
    { id: 'FOODON_03301026', name: 'Bột Thịt Bò / Chiết Xuất Bò (Beef Extract)', label: 'Meat extract', icon: '🍲', category: 'bò', group: 'Chiết xuất thịt' },

    // 🍖 THỊT HEO / LỢN (Pork - FOODON_00001030)
    { id: 'FOODON_00001030', name: 'Thịt Heo / Thịt Lợn (Pork)', label: 'Porcine meat', icon: '🍖', category: 'heo', group: 'Thịt đỏ' },

    // 🌽 BẮP / NGÔ (Corn / Maize - FOODON_00001075)
    { id: 'FOODON_00001075', name: 'Bắp / Ngô (Corn / Maize)', label: 'Cereal grain', icon: '🌽', category: 'bắp', group: 'Ngũ cốc' },
    { id: 'FOODON_03301076', name: 'Tinh Bột Bắp (Corn Starch)', label: 'Cereal starch', icon: '🌽', category: 'bắp', group: 'Tinh bột' },

    // 🌾 GẠO (Rice - FOODON_00001050)
    { id: 'FOODON_00001050', name: 'Gạo / Cơm (Rice)', label: 'Cereal grain', icon: '🌾', category: 'gạo', group: 'Ngũ cốc' },

    // 🧪 SULFITE (Sulfites Preservatives - FOODON_00002400)
    { id: 'FOODON_00002400', name: 'Sulfite / Sunfit (E220-E228)', label: 'Preservative allergen', icon: '🧪', category: 'sulfite', group: 'Chất bảo quản' }
  ];

  const FALLBACK_FOODON = FOODON_SUGGESTIONS_DB;

  // DOM Elements
