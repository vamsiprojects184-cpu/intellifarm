/**
 * ECO CROP seed script.
 * Run with: `bun run src/lib/seed.ts`
 * Idempotent — safe to run multiple times.
 */
import { db } from "./db";
import { hashPassword } from "./password";

async function main() {
  console.log("🌱 Seeding Eco Crop database...");

  // ---------- Admin user ----------
  const adminEmail = "admin@ecocrop.farm";
  let admin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await db.user.create({
      data: {
        fullName: "Eco Crop Admin",
        email: adminEmail,
        mobile: "9000000000",
        passwordHash: await hashPassword("admin123"),
        role: "ADMIN",
        state: "Maharashtra",
        district: "Pune",
        isVerified: true,
      },
    });
    console.log("  ✓ Admin created (admin@ecocrop.farm / admin123)");
  }

  // Demo farmer
  const farmerEmail = "farmer@ecocrop.farm";
  let farmer = await db.user.findUnique({ where: { email: farmerEmail } });
  if (!farmer) {
    farmer = await db.user.create({
      data: {
        fullName: "Ramesh Patil",
        email: farmerEmail,
        mobile: "9000000001",
        passwordHash: await hashPassword("farmer123"),
        role: "FARMER",
        state: "Maharashtra",
        district: "Pune",
        village: "Shirur",
        farmingExp: "EXPERIENCED",
        primaryCrop: "Tomato",
        farmSizeAcres: 3.5,
        isVerified: true,
      },
    });
    console.log("  ✓ Demo farmer created (farmer@ecocrop.farm / farmer123)");
  }

  // Demo expert
  const expertEmail = "expert@ecocrop.farm";
  let expertUser = await db.user.findUnique({ where: { email: expertEmail } });
  if (!expertUser) {
    expertUser = await db.user.create({
      data: {
        fullName: "Dr. Anjali Deshmukh",
        email: expertEmail,
        mobile: "9000000002",
        passwordHash: await hashPassword("expert123"),
        role: "EXPERT",
        state: "Maharashtra",
        district: "Pune",
        isVerified: true,
      },
    });
    await db.expertProfile.create({
      data: {
        userId: expertUser.id,
        specialization: "Plant Pathology & Crop Disease",
        experience: 12,
        qualification: "Ph.D. Agricultural Sciences",
        bio: "Senior agricultural scientist specializing in crop disease diagnosis and integrated pest management.",
        isVerified: true,
        rating: 4.8,
      },
    });
    console.log("  ✓ Demo expert created (expert@ecocrop.farm / expert123)");
  }

  // ---------- Crop database ----------
  const crops = [
    { name: "Rice", scientificName: "Oryza sativa", category: "CEREAL", season: "KHARIF", durationDays: 120, waterNeed: "HIGH", description: "Staple food crop grown in flooded fields." },
    { name: "Wheat", scientificName: "Triticum aestivum", category: "CEREAL", season: "RABI", durationDays: 110, waterNeed: "MEDIUM", description: "Primary rabi cereal crop." },
    { name: "Maize", scientificName: "Zea mays", category: "CEREAL", season: "KHARIF", durationDays: 90, waterNeed: "MEDIUM", description: "Versatile cereal used for food, feed and fodder." },
    { name: "Tomato", scientificName: "Solanum lycopersicum", category: "VEGETABLE", season: "ALL", durationDays: 75, waterNeed: "MEDIUM", description: "High-value vegetable crop." },
    { name: "Onion", scientificName: "Allium cepa", category: "VEGETABLE", season: "RABI", durationDays: 100, waterNeed: "LOW", description: "Important cash vegetable crop." },
    { name: "Cotton", scientificName: "Gossypium hirsutum", category: "CASH", season: "KHARIF", durationDays: 180, waterNeed: "MEDIUM", description: "Major fibre cash crop." },
    { name: "Soybean", scientificName: "Glycine max", category: "PULSE", season: "KHARIF", durationDays: 100, waterNeed: "MEDIUM", description: "Oilseed and protein-rich pulse crop." },
    { name: "Groundnut", scientificName: "Arachis hypogaea", category: "OILSEED", season: "KHARIF", durationDays: 110, waterNeed: "LOW", description: "Important oilseed crop." },
    { name: "Sugarcane", scientificName: "Saccharum officinarum", category: "CASH", season: "ALL", durationDays: 300, waterNeed: "HIGH", description: "Long-duration cash crop for sugar." },
    { name: "Potato", scientificName: "Solanum tuberosum", category: "VEGETABLE", season: "RABI", durationDays: 90, waterNeed: "MEDIUM", description: "Tuber vegetable crop." },
    { name: "Chilli", scientificName: "Capsicum annuum", category: "SPICE", season: "ALL", durationDays: 120, waterNeed: "MEDIUM", description: "Spice and cash crop." },
    { name: "Banana", scientificName: "Musa paradisiaca", category: "FRUIT", season: "ALL", durationDays: 300, waterNeed: "HIGH", description: "Tropical fruit crop." },
    { name: "Gram", scientificName: "Cicer arietinum", category: "PULSE", season: "RABI", durationDays: 100, waterNeed: "LOW", description: "Important rabi pulse (chickpea)." },
    { name: "Mustard", scientificName: "Brassica juncea", category: "OILSEED", season: "RABI", durationDays: 110, waterNeed: "LOW", description: "Rabi oilseed crop." },
    { name: "Brinjal", scientificName: "Solanum melongena", category: "VEGETABLE", season: "ALL", durationDays: 90, waterNeed: "MEDIUM", description: "Common vegetable crop." },
  ];
  for (const c of crops) {
    await db.cropDatabase.upsert({
      where: { name: c.name },
      create: c,
      update: c,
    });
  }
  console.log(`  ✓ ${crops.length} crops in reference database`);

  // ---------- Irrigation configs ----------
  const irrigationConfigs = [
    { cropName: "Rice", moistureThreshold: 45, tempThreshold: 35, rainThreshold: 80, baseWaterLitres: 1200, baseDurationMin: 90 },
    { cropName: "Wheat", moistureThreshold: 30, tempThreshold: 30, rainThreshold: 55, baseWaterLitres: 500, baseDurationMin: 45 },
    { cropName: "Maize", moistureThreshold: 32, tempThreshold: 32, rainThreshold: 60, baseWaterLitres: 550, baseDurationMin: 50 },
    { cropName: "Tomato", moistureThreshold: 35, tempThreshold: 32, rainThreshold: 55, baseWaterLitres: 450, baseDurationMin: 40 },
    { cropName: "Onion", moistureThreshold: 28, tempThreshold: 33, rainThreshold: 50, baseWaterLitres: 350, baseDurationMin: 30 },
    { cropName: "Cotton", moistureThreshold: 30, tempThreshold: 35, rainThreshold: 60, baseWaterLitres: 600, baseDurationMin: 55 },
    { cropName: "Soybean", moistureThreshold: 33, tempThreshold: 33, rainThreshold: 55, baseWaterLitres: 500, baseDurationMin: 45 },
    { cropName: "Sugarcane", moistureThreshold: 40, tempThreshold: 35, rainThreshold: 70, baseWaterLitres: 1000, baseDurationMin: 80 },
    { cropName: "Potato", moistureThreshold: 35, tempThreshold: 30, rainThreshold: 55, baseWaterLitres: 500, baseDurationMin: 45 },
    { cropName: "Banana", moistureThreshold: 40, tempThreshold: 34, rainThreshold: 65, baseWaterLitres: 800, baseDurationMin: 60 },
  ];
  for (const ic of irrigationConfigs) {
    await db.irrigationConfig.upsert({
      where: { cropName: ic.cropName },
      create: ic,
      update: ic,
    });
  }
  console.log(`  ✓ ${irrigationConfigs.length} irrigation configs`);

  // ---------- Disease database ----------
  const diseases = [
    { cropName: "Tomato", diseaseName: "Early Blight", symptoms: "Dark brown concentric rings on lower leaves, yellowing around spots, leaf drop.", cause: "Fungus Alternaria solani", severity: "MODERATE", treatment: "Apply copper-based fungicide or mancozeb every 7-10 days. Remove infected leaves.", prevention: "Crop rotation, proper spacing, avoid overhead watering, use disease-free seed." },
    { cropName: "Tomato", diseaseName: "Late Blight", symptoms: "Water-soaked lesions on leaves, white mold on undersides, rapid browning.", cause: "Oomycete Phytophthora infestans", severity: "SEVERE", treatment: "Apply metalaxyl + mancozeb immediately. Destroy infected plants.", prevention: "Use resistant varieties, ensure good drainage, avoid working with wet plants." },
    { cropName: "Tomato", diseaseName: "Leaf Curl Virus", symptoms: "Upward curling of leaves, yellowing, stunted growth, reduced yield.", cause: "Begomovirus transmitted by whiteflies", severity: "HIGH", treatment: "No cure. Remove and destroy infected plants. Control whitefly with imidacloprid.", prevention: "Use resistant varieties, control whitefly vector, remove weeds." },
    { cropName: "Rice", diseaseName: "Blast", symptoms: "Diamond-shaped lesions on leaves, neck rot, white empty panicles.", cause: "Fungus Magnaporthe oryzae", severity: "SEVERE", treatment: "Apply tricyclazole or azoxystrobin at booting and heading stages.", prevention: "Use resistant varieties, balanced nitrogen, avoid dense planting." },
    { cropName: "Rice", diseaseName: "Bacterial Leaf Blight", symptoms: "Yellow water-soaked stripes on leaves turning yellow then white, wilting.", cause: "Bacterium Xanthomonas oryzae", severity: "HIGH", treatment: "Apply copper hydroxide. Drain field briefly.", prevention: "Use resistant varieties, clean seed, avoid flood injury." },
    { cropName: "Wheat", diseaseName: "Rust (Brown)", symptoms: "Orange-brown pustules in stripes on leaves, reducing grain fill.", cause: "Fungus Puccinia triticina", severity: "HIGH", treatment: "Apply propiconazole or tebuconazole fungicide.", prevention: "Grow resistant varieties, timely sowing, balanced nutrition." },
    { cropName: "Maize", diseaseName: "Downy Mildew", symptoms: "Chlorotic streaks on leaves, downy growth on undersides, stunted plants.", cause: "Oomycete Peronosclerospora spp.", severity: "HIGH", treatment: "Apply metalaxyl seed treatment and foliar spray.", prevention: "Use resistant hybrids, remove infected plants, crop rotation." },
    { cropName: "Cotton", diseaseName: "Bollworm Damage", symptoms: "Holes in bolls, feeding on squares and bolls, shed bolls.", cause: "Helicoverpa armigera (pest)", severity: "SEVERE", treatment: "Spray Bt formulations or spinosad. Use pheromone traps.", prevention: "Grow Bt cotton, monitor with pheromone traps, avoid excessive nitrogen." },
    { cropName: "Potato", diseaseName: "Early Blight", symptoms: "Dark lesions with concentric rings on lower leaves, defoliation.", cause: "Fungus Alternaria solani", severity: "MODERATE", treatment: "Apply mancozeb or chlorothalonil.", prevention: "Crop rotation, certified seed, adequate nutrition." },
    { cropName: "Onion", diseaseName: "Purple Blotch", symptoms: "Small water-soaked lesions turning purple with yellow halos.", cause: "Fungus Alternaria porri", severity: "MODERATE", treatment: "Apply mancozeb + copper fungicide.", prevention: "Crop rotation, proper spacing, avoid overhead irrigation." },
    { cropName: "Soybean", diseaseName: "Yellow Mosaic Virus", symptoms: "Yellow mosaic pattern on leaves, stunting, pod reduction.", cause: "Begomovirus via whitefly", severity: "HIGH", treatment: "No cure. Control whitefly. Remove infected plants.", prevention: "Use resistant varieties, whitefly control, weed management." },
    { cropName: "Chilli", diseaseName: "Powdery Mildew", symptoms: "White powdery growth on leaves, leaf curling, defoliation.", cause: "Fungus Leveillula taurica", severity: "MODERATE", treatment: "Apply sulphur or hexaconazole fungicide.", prevention: "Proper spacing, avoid humidity build-up, remove debris." },
  ];
  for (const d of diseases) {
    const existing = await db.diseaseDatabase.findFirst({
      where: { cropName: d.cropName, diseaseName: d.diseaseName },
    });
    if (!existing) {
      await db.diseaseDatabase.create({ data: d });
    }
  }
  console.log(`  ✓ ${diseases.length} diseases in database`);

  // ---------- Markets ----------
  const markets = [
    { name: "Pune APMC", state: "Maharashtra", district: "Pune" },
    { name: "Nashik Market Yard", state: "Maharashtra", district: "Nashik" },
    { name: "Lasalgaon Mandi", state: "Maharashtra", district: "Nashik" },
    { name: "Indore APMC", state: "Madhya Pradesh", district: "Indore" },
    { name: "Delhi Azadpur", state: "Delhi", district: "Delhi" },
    { name: "Bangalore APMC", state: "Karnataka", district: "Bengaluru" },
    { name: "Hyderabad Market", state: "Telangana", district: "Hyderabad" },
    { name: "Nagpur APMC", state: "Maharashtra", district: "Nagpur" },
  ];
  for (const m of markets) {
    const existing = await db.market.findFirst({ where: { name: m.name } });
    if (!existing) {
      await db.market.create({ data: m });
    }
  }

  // ---------- Market prices (demo, last 7 days) ----------
  const allMarkets = await db.market.findMany();
  const priceCrops = ["Onion", "Tomato", "Potato", "Wheat", "Rice", "Maize", "Soybean", "Cotton", "Gram", "Mustard"];
  const basePrices: Record<string, number> = {
    Onion: 2200, Tomato: 1800, Potato: 1400, Wheat: 2200, Rice: 2400,
    Maize: 1900, Soybean: 4500, Cotton: 6200, Gram: 5200, Mustard: 5400,
  };
  const today = new Date();
  let priceCount = 0;
  for (const market of allMarkets) {
    for (const crop of priceCrops) {
      const base = basePrices[crop];
      // generate 7 days history
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const variance = (Math.random() - 0.5) * 0.18;
        const modal = Math.round(base * (1 + variance));
        const min = Math.round(modal * (0.9 + Math.random() * 0.04));
        const max = Math.round(modal * (1.06 + Math.random() * 0.04));
        const exists = await db.marketPrice.findFirst({
          where: { marketId: market.id, cropName: crop, priceDate: date },
        });
        if (!exists) {
          await db.marketPrice.create({
            data: {
              cropName: crop,
              marketId: market.id,
              minPrice: min,
              maxPrice: max,
              modalPrice: modal,
              priceDate: date,
              isDemo: true,
            },
          });
          priceCount++;
        }
      }
    }
  }
  console.log(`  ✓ ${priceCount} market price records (labelled Demo)`);

  // ---------- Government schemes ----------
  const schemes = [
    {
      name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
      description: "Income support scheme providing ₹6,000 per year to small and marginal farmer families holding cultivable land.",
      eligibility: "All landholding farmer families with cultivable landholding, excluding institutional landholders, former/present holders of constitutional posts, government employees above Group D, income tax payers, and professionals.",
      benefits: "₹6,000 per year in three equal instalments of ₹2,000 each, transferred directly to bank account.",
      requiredDocs: "Aadhaar card, landholding documents (Patta/Khata), bank account details, citizenship proof.",
      applicationProcess: "Register online at pmkisan.gov.in or visit nearest Common Service Centre (CSC) with required documents. Verification done by State/Nodal officer.",
      officialSource: "Government of India, Ministry of Agriculture & Farmers Welfare",
      officialUrl: "https://pmkisan.gov.in",
      state: "ALL",
      category: "INCOME_SUPPORT",
      level: "CENTRAL",
    },
    {
      name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
      description: "Crop insurance scheme providing financial support to farmers suffering crop loss/damage arising out of unforeseen events.",
      eligibility: "All loanee farmer farmers and non-loanee farmers growing notified crops in notified areas.",
      benefits: "Comprehensive crop insurance coverage with low premium (2% for kharif, 1.5% for rabi, 5% for commercial/horticultural crops).",
      requiredDocs: "Land documents, bank account, identity proof, sowing certificate.",
      applicationProcess: "Contact bank or insurance company empanelled under scheme before sowing season cut-off date.",
      officialSource: "Government of India, Department of Agriculture & Cooperation",
      officialUrl: "https://pmfby.gov.in",
      state: "ALL",
      category: "INSURANCE",
      level: "CENTRAL",
    },
    {
      name: "Soil Health Card Scheme",
      description: "Scheme providing soil health cards to farmers with nutrient status of soil and crop-wise recommendations of nutrients.",
      eligibility: "All farmers holding cultivable land in India.",
      benefits: "Free soil testing and nutrient recommendations every 2 years, helping reduce fertilizer cost and improve yield.",
      requiredDocs: "Land ownership document, identity proof.",
      applicationProcess: "Visit nearest soil testing laboratory or agriculture office. Contact village agriculture officer.",
      officialSource: "Government of India, Ministry of Agriculture & Farmers Welfare",
      officialUrl: "https://soilhealth.dac.gov.in",
      state: "ALL",
      category: "SUBSIDY",
      level: "CENTRAL",
    },
    {
      name: "Micro Irrigation (Pradhan Mantri Krishi Sinchayee Yojana)",
      description: "Scheme promoting micro irrigation (drip and sprinkler) to enhance water use efficiency.",
      eligibility: "All categories of farmers. Group of farmers can also apply.",
      benefits: "Subsidy up to 55% for individual farmers (45% central + 10% state), up to 80% for groups/farmer producer organizations.",
      requiredDocs: "Land documents, bank passbook, identity proof, quotation for irrigation system.",
      applicationProcess: "Apply through state horticulture/agriculture department office with quotation from empanelled suppliers.",
      officialSource: "Government of India, Ministry of Agriculture & Farmers Welfare",
      officialUrl: "https://pmksy.gov.in",
      state: "ALL",
      category: "EQUIPMENT",
      level: "CENTRAL",
    },
    {
      name: "Kisan Credit Card (KCC)",
      description: "Scheme providing farmers easy access to short-term credit for cultivation, post-harvest and allied activities.",
      eligibility: "All farmers (owner-cultivators, tenant farmers, oral lessees, sharecroppers) including SHGs of farmers.",
      benefits: "Easy credit at low interest (4% on timely repayment), up to ₹3 lakh. Covers cultivation, equipment and allied activities.",
      requiredDocs: "Land records, identity proof, bank account, photograph.",
      applicationProcess: "Apply at nearest commercial/cooperative bank or RRB branch. Sanctioned within 14 days of complete application.",
      officialSource: "Government of India, Ministry of Finance",
      officialUrl: "https://www.myscheme.gov.in/schemes/kcc",
      state: "ALL",
      category: "LOAN",
      level: "CENTRAL",
    },
    {
      name: "Agricultural Mechanization Sub-Mission (SMAM)",
      description: "Sub-mission on agricultural mechanization to increase reach of farm machinery to small and marginal farmers.",
      eligibility: "Individual farmers, FPOs, CHCs, custom hiring centres.",
      benefits: "Subsidy up to 40-50% on purchase of agricultural machinery and equipment.",
      requiredDocs: "Land document, Aadhaar, bank details, quotation.",
      applicationProcess: "Apply at state agriculture department or via online portal with equipment quotation.",
      officialSource: "Government of India, Ministry of Agriculture & Farmers Welfare",
      officialUrl: "https://farmech.dac.gov.in",
      state: "ALL",
      category: "EQUIPMENT",
      level: "CENTRAL",
    },
    {
      name: "Maharashtra Magel Tyala Shettale Yojana",
      description: "Farm pond scheme providing financial assistance for constructing farm ponds for rainwater harvesting.",
      eligibility: "Maharashtra farmers owning cultivable land with suitable topography.",
      benefits: "Financial assistance up to ₹50,000-75,000 for farm pond construction.",
      requiredDocs: "7/12 land document, Aadhaar, bank passbook.",
      applicationProcess: "Apply online through Aaple Sarkar portal or visit talathi/agriculture office.",
      officialSource: "Government of Maharashtra, Water Resources Department",
      officialUrl: "https://aaplesarkar.maharashtra.gov.in",
      state: "Maharashtra",
      category: "SUBSIDY",
      level: "STATE",
    },
    {
      name: "National Agriculture Market (eNAM)",
      description: "Online trading platform for agricultural commodities enabling transparent price discovery.",
      eligibility: "Farmers with produce to sell in notified APMC markets integrated with eNAM.",
      benefits: "Online transparent auction, wider market access, better price realization, instant online payment.",
      requiredDocs: "Aadhaar, bank account, land document, mobile number.",
      applicationProcess: "Register free at enam.gov.in or visit nearest eNAM-integrated APMC.",
      officialSource: "Government of India, Ministry of Agriculture",
      officialUrl: "https://enam.gov.in",
      state: "ALL",
      category: "INCOME_SUPPORT",
      level: "CENTRAL",
    },
    {
      name: "Paramparagat Krishi Vikas Yojana (PKVY)",
      description: "Scheme promoting organic farming through cluster approach and certification.",
      eligibility: "Farmer groups/FPOs of minimum 50 farmers with 50 acres total area.",
      benefits: "₹50,000 per hectare over 3 years for organic inputs, certification, marketing and value addition.",
      requiredDocs: "Land documents, group registration, bank details.",
      applicationProcess: "Form farmer group, apply through state agriculture department.",
      officialSource: "Government of India, Ministry of Agriculture & Farmers Welfare",
      officialUrl: "https://pgsindia-ncof.gov.in",
      state: "ALL",
      category: "SUBSIDY",
      level: "CENTRAL",
    },
    {
      name: "Pradhan Mantri Annadata Aay SanraksHan Abhiyan (PMBJY/PSS)",
      description: "Scheme ensuring remunerative prices to farmers through market intervention.",
      eligibility: "Farmers growing notified pulses, oilseeds and cotton.",
      benefits: "Procurement at MSP when market price falls below MSP.",
      requiredDocs: "Land record, Aadhaar, bank account.",
      applicationProcess: "Register at procurement centre during procurement season.",
      officialSource: "Government of India, Ministry of Agriculture",
      officialUrl: "https://pss-nafed.in",
      state: "ALL",
      category: "INCOME_SUPPORT",
      level: "CENTRAL",
    },
  ];
  for (const s of schemes) {
    const existing = await db.governmentScheme.findFirst({ where: { name: s.name } });
    if (!existing) {
      await db.governmentScheme.create({ data: s });
    }
  }
  console.log(`  ✓ ${schemes.length} government schemes`);

  // ---------- Seed a demo farm for the demo farmer ----------
  if (farmer) {
    const existingFarm = await db.farm.findFirst({
      where: { ownerId: farmer.id, name: "Patil Family Farm" },
    });
    if (!existingFarm) {
      const farm = await db.farm.create({
        data: {
          ownerId: farmer.id,
          name: "Patil Family Farm",
          state: "Maharashtra",
          district: "Pune",
          village: "Shirur",
          latitude: 18.62,
          longitude: 74.38,
          areaAcres: 3.5,
          soilType: "LOAMY",
          irrigationType: "DRIP",
          waterSource: "BOREWELL",
          description: "Family-owned diversified farm growing tomatoes and onions with drip irrigation.",
        },
      });
      // demo crop
      const plantingDate = new Date();
      plantingDate.setDate(plantingDate.getDate() - 32);
      const harvest = new Date(plantingDate);
      harvest.setDate(harvest.getDate() + 45);
      await db.crop.create({
        data: {
          farmId: farm.id,
          name: "Tomato",
          variety: "Pusa Ruby",
          plantingDate,
          expectedHarvest: harvest,
          stage: "VEGETATIVE",
          areaAcres: 1.5,
          health: "GOOD",
          notes: "Hybrid variety with drip irrigation.",
        },
      });
      // demo sensor
      const sensor = await db.sensor.create({
        data: {
          farmId: farm.id,
          sensorId: "EC-SENSOR-001",
          name: "Field 1 Soil Sensor",
          type: "SOIL_MOISTURE",
          location: "Tomato plot",
        },
      });
      // seed 7 days of readings
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const ts = new Date(now);
        ts.setHours(ts.getHours() - i * 12);
        await db.sensorReading.create({
          data: {
            sensorId: sensor.id,
            farmId: farm.id,
            soilMoisture: 28 + Math.random() * 22,
            temperature: 24 + Math.random() * 10,
            humidity: 55 + Math.random() * 25,
            waterLevel: 70 + Math.random() * 20,
            timestamp: ts,
          },
        });
      }
      // a few activities
      await db.farmActivity.create({ data: { farmId: farm.id, type: "PLANTING", title: "Tomato seedlings transplanted", description: "Pusa Ruby variety, 1.5 acres", isAuto: false, createdAt: plantingDate } });
      await db.farmActivity.create({ data: { farmId: farm.id, type: "IRRIGATION", title: "Drip irrigation - 450L", description: "Routine drip session", isAuto: false, createdAt: new Date(now.getTime() - 3 * 86400000) } });
      await db.farmActivity.create({ data: { farmId: farm.id, type: "FERTILIZER", title: "NPK 19-19-19 applied", description: "Foliar spray for vegetative growth", isAuto: false, createdAt: new Date(now.getTime() - 5 * 86400000) } });
      // demo recommendations
      await db.recommendation.create({ data: { userId: farmer.id, farmId: farm.id, category: "IRRIGATION", title: "Irrigation recommended today", description: "Soil moisture at 29% is below threshold (35%). No rain expected for 24h. Apply ~450L drip irrigation.", priority: "HIGH", status: "PENDING" } });
      await db.recommendation.create({ data: { userId: farmer.id, farmId: farm.id, category: "WEATHER", title: "Monitor for fungal disease", description: "High humidity (75%+) over next 3 days increases early blight risk. Inspect tomato lower leaves daily.", priority: "MEDIUM", status: "PENDING" } });
      await db.recommendation.create({ data: { userId: farmer.id, farmId: farm.id, category: "FERTILIZER", title: "Side-dress nitrogen", description: "Vegetative stage tomato benefits from 25kg/acre urea side-dressing this week.", priority: "LOW", status: "PENDING" } });
      // demo alerts
      await db.alert.create({ data: { userId: farmer.id, farmId: farm.id, category: "WEATHER", title: "Thunderstorm expected tomorrow", message: "Heavy rain (75% probability) expected tomorrow. Inspect drainage channels today.", priority: "HIGH" } });
      await db.alert.create({ data: { userId: farmer.id, farmId: farm.id, category: "SENSOR", title: "Low soil moisture detected", message: "Field 1 soil moisture dropped to 29% — below optimal range.", priority: "MEDIUM" } });
      // demo notifications
      await db.notification.create({ data: { userId: farmer.id, category: "MARKET", title: "Tomato price update", message: "Tomato modal price at Pune APMC today: ₹1,820/quintal.", priority: "INFO" } });
      await db.notification.create({ data: { userId: farmer.id, category: "SCHEME", title: "PM-KISAN instalment", message: "New PM-KISAN instalment may be due. Check eligibility on pmkisan.gov.in", priority: "LOW" } });
      console.log("  ✓ Demo farm, crop, sensor readings, activities, recommendations, alerts seeded");
    }
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
