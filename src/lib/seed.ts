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

  // ---------- Fertilizer recommendations ----------
  const fertilizerRecs = [
    { cropName: "Rice", growthStage: "PLANTED", nitrogen: 30, phosphorus: 20, potassium: 20, fertilizer: "DAP + Urea", quantity: "50 kg DAP + 30 kg Urea per acre", timing: "At transplanting as basal dose", notes: "Apply 50% N as basal, 25% at tillering, 25% at panicle initiation" },
    { cropName: "Rice", growthStage: "VEGETATIVE", nitrogen: 25, phosphorus: 0, potassium: 0, fertilizer: "Urea", quantity: "25 kg Urea per acre", timing: "30 days after transplanting (tillering stage)", notes: "Top-dress nitrogen in split doses" },
    { cropName: "Rice", growthStage: "FLOWERING", nitrogen: 20, phosphorus: 0, potassium: 15, fertilizer: "Urea + MOP", quantity: "20 kg Urea + 10 kg MOP per acre", timing: "At panicle initiation", notes: "Last nitrogen application before flowering" },
    { cropName: "Wheat", growthStage: "PLANTED", nitrogen: 30, phosphorus: 25, potassium: 15, fertilizer: "DAP + Urea", quantity: "55 kg DAP + 20 kg Urea per acre", timing: "At sowing as basal dose", notes: "Apply full P and K, half N as basal" },
    { cropName: "Wheat", growthStage: "VEGETATIVE", nitrogen: 30, phosphorus: 0, potassium: 0, fertilizer: "Urea", quantity: "30 kg Urea per acre", timing: "21 and 45 days after sowing (CRI stage)", notes: "Split into two top-dressings" },
    { cropName: "Tomato", growthStage: "PLANTED", nitrogen: 20, phosphorus: 25, potassium: 20, fertilizer: "NPK 19-19-19", quantity: "40 kg per acre as basal", timing: "At transplanting", notes: "Mix well in soil before transplanting" },
    { cropName: "Tomato", growthStage: "VEGETATIVE", nitrogen: 25, phosphorus: 0, potassium: 0, fertilizer: "Urea (foliar)", quantity: "2% urea spray, 5 L per acre", timing: "20-30 days after transplanting", notes: "Foliar spray for vigorous vegetative growth" },
    { cropName: "Tomato", growthStage: "FLOWERING", nitrogen: 10, phosphorus: 15, potassium: 20, fertilizer: "NPK 0-52-34 (MKP)", quantity: "5 kg per acre foliar", timing: "At flowering", notes: "Improves flower set and fruit quality" },
    { cropName: "Tomato", growthStage: "FRUITING", nitrogen: 5, phosphorus: 0, potassium: 25, fertilizer: "Potash (MOP)", quantity: "15 kg per acre", timing: "During fruit development", notes: "Enhances fruit size, color and shelf life" },
    { cropName: "Cotton", growthStage: "PLANTED", nitrogen: 15, phosphorus: 20, potassium: 15, fertilizer: "DAP + MOP", quantity: "45 kg DAP + 10 kg MOP per acre", timing: "At sowing", notes: "Basal application of P and K" },
    { cropName: "Cotton", growthStage: "VEGETATIVE", nitrogen: 30, phosphorus: 0, potassium: 0, fertilizer: "Urea", quantity: "30 kg Urea per acre", timing: "30-45 days after sowing", notes: "Split into 2 applications" },
    { cropName: "Cotton", growthStage: "FLOWERING", nitrogen: 15, phosphorus: 0, potassium: 10, fertilizer: "Urea + MOP", quantity: "15 kg Urea + 8 kg MOP per acre", timing: "At square formation", notes: "Last N application" },
    { cropName: "Onion", growthStage: "PLANTED", nitrogen: 15, phosphorus: 25, potassium: 20, fertilizer: "SSP + MOP", quantity: "100 kg SSP + 15 kg MOP per acre", timing: "At transplanting as basal", notes: "Onion needs high sulfur, use SSP" },
    { cropName: "Onion", growthStage: "VEGETATIVE", nitrogen: 25, phosphorus: 0, potassium: 0, fertilizer: "Urea", quantity: "25 kg Urea per acre", timing: "30 and 45 days after transplanting", notes: "Split application for bulb development" },
    { cropName: "Onion", growthStage: "FRUITING", nitrogen: 10, phosphorus: 0, potassium: 20, fertilizer: "MOP", quantity: "15 kg MOP per acre", timing: "Bulb enlargement stage (60-75 days)", notes: "Improves bulb size and quality" },
    { cropName: "Maize", growthStage: "PLANTED", nitrogen: 20, phosphorus: 25, potassium: 15, fertilizer: "DAP + MOP", quantity: "55 kg DAP + 10 kg MOP per acre", timing: "At sowing as basal", notes: "Apply near seed but not in direct contact" },
    { cropName: "Maize", growthStage: "VEGETATIVE", nitrogen: 35, phosphorus: 0, potassium: 0, fertilizer: "Urea", quantity: "35 kg Urea per acre", timing: "25-30 days after sowing (knee-high stage)", notes: "Critical nitrogen top-dressing" },
    { cropName: "Maize", growthStage: "FLOWERING", nitrogen: 15, phosphorus: 0, potassium: 0, fertilizer: "Urea", quantity: "15 kg Urea per acre", timing: "At tasseling (50-55 days)", notes: "Final N application for grain filling" },
    { cropName: "Potato", growthStage: "PLANTED", nitrogen: 20, phosphorus: 30, potassium: 30, fertilizer: "NPK 10-26-26", quantity: "100 kg per acre as basal", timing: "At planting in furrows", notes: "Potato is high K feeder" },
    { cropName: "Potato", growthStage: "VEGETATIVE", nitrogen: 25, phosphorus: 0, potassium: 0, fertilizer: "Urea", quantity: "25 kg Urea per acre", timing: "25 and 40 days after planting", notes: "Earthing up after first top-dress" },
    { cropName: "Soybean", growthStage: "PLANTED", nitrogen: 0, phosphorus: 25, potassium: 20, fertilizer: "SSP + MOP + Rhizobium", quantity: "100 kg SSP + 15 kg MOP per acre + Rhizobium seed treatment", timing: "At sowing", notes: "Soybean fixes own N; use Rhizobium culture" },
    { cropName: "Soybean", growthStage: "VEGETATIVE", nitrogen: 0, phosphorus: 0, potassium: 0, fertilizer: "Foliar spray", quantity: "0.5% ZnSO4 + 1% FeSO4 spray", timing: "30-40 days after sowing", notes: "Micronutrient spray if deficiency observed" },
    { cropName: "Groundnut", growthStage: "PLANTED", nitrogen: 5, phosphorus: 25, potassium: 20, fertilizer: "SSP + MOP + Gypsum", quantity: "100 kg SSP + 15 kg MOP + 200 kg Gypsum per acre", timing: "At sowing (basal)", notes: "Gypsum provides Ca and S for pod development" },
    { cropName: "Groundnut", growthStage: "FLOWERING", nitrogen: 0, phosphorus: 0, potassium: 0, fertilizer: "Gypsum", quantity: "200 kg per acre", timing: "At pegging stage (35-40 days)", notes: "Apply around base for pod filling" },
    { cropName: "Sugarcane", growthStage: "PLANTED", nitrogen: 30, phosphorus: 25, potassium: 25, fertilizer: "NPK complex", quantity: "80 kg 17-17-17 per acre", timing: "At planting", notes: "Basal application in furrows" },
    { cropName: "Sugarcane", growthStage: "VEGETATIVE", nitrogen: 50, phosphorus: 0, potassium: 0, fertilizer: "Urea", quantity: "50 kg Urea per acre", timing: "45, 90 and 120 days after planting", notes: "Split into 3 applications" },
    { cropName: "Mustard", growthStage: "PLANTED", nitrogen: 20, phosphorus: 25, potassium: 15, fertilizer: "DAP + MOP + Urea", quantity: "45 kg DAP + 10 kg MOP + 15 kg Urea per acre", timing: "At sowing", notes: "Apply sulfur through SSP if deficient" },
    { cropName: "Mustard", growthStage: "VEGETATIVE", nitrogen: 25, phosphorus: 0, potassium: 0, fertilizer: "Urea", quantity: "25 kg Urea per acre", timing: "30 days after sowing", notes: "Single top-dressing" },
    { cropName: "Gram", growthStage: "PLANTED", nitrogen: 5, phosphorus: 25, potassium: 15, fertilizer: "DAP + Rhizobium", quantity: "50 kg DAP per acre + Rhizobium seed treatment", timing: "At sowing", notes: "Gram fixes N; starter N only" },
    { cropName: "Chilli", growthStage: "PLANTED", nitrogen: 15, phosphorus: 25, potassium: 20, fertilizer: "NPK 19-19-19", quantity: "40 kg per acre as basal", timing: "At transplanting", notes: "Well-decomposed FYM recommended" },
    { cropName: "Chilli", growthStage: "FLOWERING", nitrogen: 10, phosphorus: 10, potassium: 20, fertilizer: "NPK 0-52-34 (MKP)", quantity: "5 kg per acre foliar", timing: "At flowering", notes: "Improves fruit set" },
    { cropName: "Banana", growthStage: "PLANTED", nitrogen: 30, phosphorus: 25, potassium: 40, fertilizer: "NPK complex + FYM", quantity: "100 kg 17-17-17 + 10 t FYM per acre", timing: "At planting", notes: "Banana is heavy K feeder" },
    { cropName: "Banana", growthStage: "VEGETATIVE", nitrogen: 40, phosphorus: 0, potassium: 30, fertilizer: "Urea + MOP", quantity: "40 kg Urea + 20 kg MOP per acre", timing: "2, 4, 6 months after planting", notes: "Split applications every 2 months" },
    { cropName: "Brinjal", growthStage: "PLANTED", nitrogen: 20, phosphorus: 25, potassium: 20, fertilizer: "NPK 19-19-19", quantity: "40 kg per acre as basal", timing: "At transplanting", notes: "Apply FYM 10 t/acre" },
    { cropName: "Brinjal", growthStage: "FLOWERING", nitrogen: 15, phosphorus: 0, potassium: 15, fertilizer: "Urea + MOP", quantity: "15 kg Urea + 10 kg MOP per acre", timing: "At first flowering", notes: "Top-dress after each harvest" },
  ];
  let fertCount = 0;
  for (const fr of fertilizerRecs) {
    const exists = await db.fertilizerRecommendation.findFirst({
      where: { cropName: fr.cropName, growthStage: fr.growthStage },
    });
    if (!exists) {
      await db.fertilizerRecommendation.create({ data: fr });
      fertCount++;
    }
  }
  console.log(`  ✓ ${fertCount} fertilizer recommendations added (${fertilizerRecs.length} total)`);

  // ---------- Pesticide database ----------
  const pesticides = [
    { pestName: "Aphids", cropName: "Tomato", pesticideName: "Imidacloprid 17.8 SL", chemicalName: "Imidacloprid", dosage: "0.3 ml/L water, 200 L/acre spray", method: "SPRAY", timing: "Early morning or evening, at pest appearance", waitingPeriod: "7 days", precaution: "Do not spray during flowering to protect bees." },
    { pestName: "Whitefly", cropName: "Cotton", pesticideName: "Spiromesifen 240 SC", chemicalName: "Spiromesifen", dosage: "0.8 ml/L water, 200 L/acre", method: "SPRAY", timing: "When 5-10 adults per leaf observed", waitingPeriod: "14 days", precaution: "Use sticker for better coverage on lower leaf surface." },
    { pestName: "Bollworm", cropName: "Cotton", pesticideName: "Spinosad 45 SC", chemicalName: "Spinosad", dosage: "0.5 ml/L water, 200 L/acre", method: "SPRAY", timing: "At egg laying or early larval stage", waitingPeriod: "10 days", precaution: "Effective against Helicoverpa. Rotate with Bt." },
    { pestName: "Stem Borer", cropName: "Rice", pesticideName: "Cartap Hydrochloride 50 SP", chemicalName: "Cartap", dosage: "400 g/acre", method: "SOIL", timing: "20-30 DAT, granular application", waitingPeriod: "30 days", precaution: "Maintain water level in field for 3 days after application." },
    { pestName: "Leafhopper", cropName: "Rice", pesticideName: "Deltamethrin 2.8 EC", chemicalName: "Deltamethrin", dosage: "1 ml/L water, 200 L/acre", method: "SPRAY", timing: "At pest appearance", waitingPeriod: "20 days", precaution: "Avoid near fish ponds." },
    { pestName: "Thrips", cropName: "Chilli", pesticideName: "Fipronil 5 SC", chemicalName: "Fipronil", dosage: "1 ml/L water, 200 L/acre", method: "SPRAY", timing: "Early stage of infestation", waitingPeriod: "15 days", precaution: "Toxic to aquatic life. Do not contaminate water." },
    { pestName: "Mites", cropName: "Chilli", pesticideName: "Abamectin 1.9 EC", chemicalName: "Abamectin", dosage: "0.5 ml/L water, 200 L/acre", method: "SPRAY", timing: "When mites observed on undersides of leaves", waitingPeriod: "14 days", precaution: "Spray undersides of leaves thoroughly." },
    { pestName: "Fruit Borer", cropName: "Tomato", pesticideName: "Indoxacarb 14.5 SC", chemicalName: "Indoxacarb", dosage: "0.5 ml/L water, 200 L/acre", method: "SPRAY", timing: "At fruiting stage, when larvae appear", waitingPeriod: "10 days", precaution: "Effective against Helicoverpa armigera." },
    { pestName: "Thrips", cropName: "Onion", pesticideName: "Lambda-cyhalothrin 5 EC", chemicalName: "Lambda-cyhalothrin", dosage: "0.5 ml/L water, 200 L/acre", method: "SPRAY", timing: "At pest appearance, repeat after 10 days", waitingPeriod: "14 days", precaution: "Spray early morning to avoid phytotoxicity." },
    { pestName: "Fall Armyworm", cropName: "Maize", pesticideName: "Emamectin Benzoate 5 SG", chemicalName: "Emamectin", dosage: "0.4 g/L water, 200 L/acre", method: "SPRAY", timing: "Whorl stage, when 5% plants infested", waitingPeriod: "10 days", precaution: "Direct spray into whorl for best results." },
    { pestName: "Aphids", cropName: "Wheat", pesticideName: "Dimethoate 30 EC", chemicalName: "Dimethoate", dosage: "1 ml/L water, 200 L/acre", method: "SPRAY", timing: "When aphids appear on earheads", waitingPeriod: "20 days", precaution: "Do not use on hot sunny days." },
    { pestName: "Pod Borer", cropName: "Gram", pesticideName: "Quinalphos 25 EC", chemicalName: "Quinalphos", dosage: "1.5 ml/L water, 200 L/acre", method: "SPRAY", timing: "At flowering and pod formation", waitingPeriod: "15 days", precaution: "Effective against Helicoverpa in pulses." },
    { pestName: "Diamondback Moth", cropName: "Cabbage", pesticideName: "Bacillus thuringiensis (Bt)", chemicalName: "Bt var. kurstaki", dosage: "1 g/L water, 200 L/acre", method: "SPRAY", timing: "At larval stage, repeat every 7 days", waitingPeriod: "0 days", precaution: "Organic, safe for beneficial insects. Best on young larvae." },
    { pestName: "Nematodes", cropName: "Tomato", pesticideName: "Carbofuran 3G", chemicalName: "Carbofuran", dosage: "10 kg/acre", method: "SOIL", timing: "At transplanting, basal application", waitingPeriod: "30 days", precaution: "Highly toxic. Use gloves. Apply near root zone." },
    { pestName: "Mealy Bug", cropName: "Grapes", pesticideName: "Chlorpyriphos 20 EC", chemicalName: "Chlorpyriphos", dosage: "2 ml/L water, 200 L/acre", method: "SPRAY", timing: "When mealybugs observed on stems and leaves", waitingPeriod: "21 days", precaution: "Avoid during fruiting. Toxic to bees." },
  ];
  let pestCount = 0;
  for (const p of pesticides) {
    const exists = await db.pesticideDatabase.findFirst({
      where: { pestName: p.pestName, cropName: p.cropName, pesticideName: p.pesticideName },
    });
    if (!exists) {
      await db.pesticideDatabase.create({ data: p });
      pestCount++;
    }
  }
  console.log(`  ✓ ${pestCount} pesticide recommendations added`);

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

      // demo soil test
      const existingSoilTest = await db.soilTest.findFirst({ where: { farmId: farm.id } });
      if (!existingSoilTest) {
        await db.soilTest.create({
          data: {
            farmId: farm.id,
            cropId: (await db.crop.findFirst({ where: { farmId: farm.id } }))?.id ?? null,
            userId: farmer.id,
            testDate: new Date(Date.now() - 15 * 86400000),
            ph: 6.8,
            nitrogen: 180,
            phosphorus: 18,
            potassium: 160,
            organicCarbon: 0.55,
            ec: 0.4,
            sulfur: 12,
            iron: 8,
            zinc: 1.2,
            boron: 0.8,
            soilMoisture: 32,
            texture: "LOAMY",
            fertility: "MEDIUM",
            labName: "Pune District Soil Testing Lab",
            notes: "Slightly low phosphorus. Recommend DAP application.",
            recommendations: JSON.stringify([
              "Low phosphorus (18 kg/ha). Apply 40-60 kg SSP/acre or 20 kg DAP/acre.",
              "Maintain regular organic matter application.",
            ]),
          },
        });
      }
      console.log("  ✓ Demo farm, crop, sensor readings, activities, recommendations, alerts, soil test seeded");
    }

    // Ensure demo soil test exists (runs even if farm already existed)
    const demoFarm = await db.farm.findFirst({
      where: { ownerId: farmer.id, name: "Patil Family Farm" },
    });
    if (demoFarm) {
      const existingSoilTest = await db.soilTest.findFirst({ where: { farmId: demoFarm.id } });
      if (!existingSoilTest) {
        const demoCrop = await db.crop.findFirst({ where: { farmId: demoFarm.id } });
        await db.soilTest.create({
          data: {
            farmId: demoFarm.id,
            cropId: demoCrop?.id ?? null,
            userId: farmer.id,
            testDate: new Date(Date.now() - 15 * 86400000),
            ph: 6.8,
            nitrogen: 180,
            phosphorus: 18,
            potassium: 160,
            organicCarbon: 0.55,
            ec: 0.4,
            sulfur: 12,
            iron: 8,
            zinc: 1.2,
            boron: 0.8,
            soilMoisture: 32,
            texture: "LOAMY",
            fertility: "MEDIUM",
            labName: "Pune District Soil Testing Lab",
            notes: "Slightly low phosphorus. Recommend DAP application.",
            recommendations: JSON.stringify([
              "Low phosphorus (18 kg/ha). Apply 40-60 kg SSP/acre or 20 kg DAP/acre.",
              "Maintain regular organic matter application.",
            ]),
          },
        });
        console.log("  ✓ Demo soil test added");
      }

      // Demo expenses
      const existingExpense = await db.farmExpense.findFirst({ where: { farmId: demoFarm.id } });
      if (!existingExpense) {
        const demoCrop2 = await db.crop.findFirst({ where: { farmId: demoFarm.id } });
        const expData = [
          { category: "SEEDS", description: "Tomato seedlings (Pusa Ruby)", amount: 1200, vendor: "Local nursery", paymentMode: "CASH", expenseDate: new Date(Date.now() - 30 * 86400000) },
          { category: "FERTILIZER", description: "NPK 19-19-19 basal dose", amount: 1800, vendor: "Krishi Kendra", paymentMode: "UPI", expenseDate: new Date(Date.now() - 28 * 86400000) },
          { category: "FERTILIZER", description: "Urea top-dressing", amount: 450, vendor: "Krishi Kendra", paymentMode: "CASH", expenseDate: new Date(Date.now() - 15 * 86400000) },
          { category: "PESTICIDE", description: "Mancozeb fungicide spray", amount: 350, vendor: "Agri shop", paymentMode: "UPI", expenseDate: new Date(Date.now() - 10 * 86400000) },
          { category: "LABOR", description: "Transplanting labor (3 workers)", amount: 900, vendor: "Village labor", paymentMode: "CASH", expenseDate: new Date(Date.now() - 30 * 86400000) },
          { category: "LABOR", description: "Weeding and spray labor", amount: 600, vendor: "Village labor", paymentMode: "CASH", expenseDate: new Date(Date.now() - 10 * 86400000) },
          { category: "IRRIGATION", description: "Drip irrigation maintenance", amount: 300, vendor: "Irrigation service", paymentMode: "CASH", expenseDate: new Date(Date.now() - 20 * 86400000) },
          { category: "FUEL", description: "Diesel for water pump", amount: 800, vendor: "Petrol pump", paymentMode: "UPI", expenseDate: new Date(Date.now() - 12 * 86400000) },
        ];
        for (const e of expData) {
          await db.farmExpense.create({
            data: { ...e, farmId: demoFarm.id, cropId: demoCrop2?.id ?? null, userId: farmer.id },
          });
        }
        console.log("  ✓ Demo expenses added (8 records)");

        // Demo pest report
        const existingPest = await db.pestReport.findFirst({ where: { farmId: demoFarm.id } });
        if (!existingPest && demoCrop2) {
          await db.pestReport.create({
            data: {
              farmId: demoFarm.id,
              cropId: demoCrop2.id,
              userId: farmer.id,
              pestName: "Aphids",
              severity: "MEDIUM",
              affectedArea: 0.5,
              observedDate: new Date(Date.now() - 8 * 86400000),
              treatment: "Imidacloprid 17.8 SL spray",
              treatmentDate: new Date(Date.now() - 7 * 86400000),
              status: "TREATED",
              notes: "Aphids on lower leaves, treated with imidacloprid spray. Monitoring for reinfestation.",
            },
          });
          console.log("  ✓ Demo pest report added");
        }
      }
    }

    // Demo tasks (independent of expense block)
    const existingTask2 = await db.farmTask.findFirst({ where: { farmId: demoFarm.id } });
    if (!existingTask2) {
      const demoCrop3 = await db.crop.findFirst({ where: { farmId: demoFarm.id } });
      const now = Date.now();
      const tasks = [
        { title: "Apply NPK fertilizer", description: "Basal dose for tomato plot", category: "FERTILIZER", priority: "HIGH", dueDate: new Date(now + 1 * 86400000), cropId: demoCrop3?.id ?? null },
        { title: "Inspect for aphids", description: "Check lower leaves for pest infestation", category: "INSPECTION", priority: "MEDIUM", dueDate: new Date(now + 2 * 86400000), cropId: demoCrop3?.id ?? null },
        { title: "Drip irrigation check", description: "Clean filters and check emitters", category: "IRRIGATION", priority: "LOW", dueDate: new Date(now + 3 * 86400000) },
        { title: "Harvest tomatoes", description: "First harvest of ready fruits", category: "HARVEST", priority: "HIGH", dueDate: new Date(now + 10 * 86400000), cropId: demoCrop3?.id ?? null },
        { title: "Soil moisture check", description: "Manual reading and log", category: "INSPECTION", priority: "MEDIUM", dueDate: new Date(now - 1 * 86400000), cropId: demoCrop3?.id ?? null, completed: true },
      ];
      for (const t of tasks) {
        await db.farmTask.create({
          data: { ...t, farmId: demoFarm.id, userId: farmer.id, completedAt: t.completed ? new Date(t.dueDate) : null },
        });
      }
      console.log("  ✓ Demo tasks added (5 records)");
    }

    // Demo plots (independent)
    const existingPlot2 = await db.farmPlot.findFirst({ where: { farmId: demoFarm.id } });
    if (!existingPlot2) {
      const plots = [
        { name: "Plot A - Tomato", cropName: "Tomato", areaAcres: 1.5, x: 5, y: 5, width: 40, height: 35, color: "#16a34a", soilType: "LOAMY", currentCrop: "Tomato (Pusa Ruby)", notes: "Main tomato plot with drip irrigation" },
        { name: "Plot B - Onion", cropName: "Onion", areaAcres: 1.0, x: 50, y: 5, width: 45, height: 35, color: "#ca8a04", soilType: "LOAMY", currentCrop: "Onion (Nashik Red)", notes: "Onion nursery and main field" },
        { name: "Plot C - Fallow", cropName: null, areaAcres: 1.0, x: 5, y: 50, width: 90, height: 45, color: "#a3a3a3", soilType: "CLAY", currentCrop: null, notes: "Resting plot, planned for next season" },
      ];
      for (const p of plots) {
        await db.farmPlot.create({ data: { ...p, farmId: demoFarm.id } });
      }
      console.log("  ✓ Demo plots added (3 field plots)");
    }

    // Demo equipment
    const existingEquip = await db.equipment.findFirst({ where: { farmId: demoFarm.id } });
    if (!existingEquip) {
      const equipData = [
        { name: "John Deere 5050D Tractor", category: "TRACTOR", brand: "John Deere", model: "5050D", purchaseDate: new Date("2023-06-15"), purchasePrice: 650000, currentValue: 550000, status: "ACTIVE", fuelType: "DIESEL", hoursUsed: 1200, lastService: new Date("2026-01-15"), nextService: new Date(Date.now() + 5 * 86400000), notes: "Main tractor for plowing and transport" },
        { name: "Drip Irrigation Pump", category: "PUMP", brand: "Kirloskar", model: "KDS-444", purchaseDate: new Date("2024-03-10"), purchasePrice: 25000, currentValue: 20000, status: "ACTIVE", fuelType: "ELECTRIC", hoursUsed: 800, lastService: new Date("2026-06-01"), nextService: new Date(Date.now() + 30 * 86400000) },
        { name: "Knapsack Sprayer", category: "SPRAYER", brand: "ASPEE", model: "KS-16", purchaseDate: new Date("2025-08-01"), purchasePrice: 3500, currentValue: 3000, status: "ACTIVE", fuelType: "MANUAL", notes: "Manual sprayer for pesticide application" },
        { name: "Power Tiller", category: "TILLER", brand: "Honda", model: "FJ500", purchaseDate: new Date("2022-11-20"), purchasePrice: 85000, currentValue: 60000, status: "MAINTENANCE", fuelType: "PETROL", hoursUsed: 500, lastService: new Date("2025-12-01"), nextService: new Date(Date.now() - 3 * 86400000), notes: "Needs clutch repair" },
      ];
      for (const e of equipData) {
        await db.equipment.create({ data: { ...e, farmId: demoFarm.id, userId: farmer.id } });
      }
      console.log("  ✓ Demo equipment added (4 items)");
    }

    // Demo inventory
    const existingInv = await db.inventoryItem.findFirst({ where: { farmId: demoFarm.id } });
    if (!existingInv) {
      const invData = [
        { name: "Tomato Seeds (Pusa Ruby)", category: "SEEDS", quantity: 0.5, unit: "kg", minStock: 0.2, pricePerUnit: 800, purchaseDate: new Date(Date.now() - 35 * 86400000), batchNo: "PR-2026-08", supplier: "Local seed shop", notes: "Hybrid tomato seeds" },
        { name: "NPK 19-19-19", category: "FERTILIZER", quantity: 45, unit: "kg", minStock: 20, pricePerUnit: 45, purchaseDate: new Date(Date.now() - 28 * 86400000), batchNo: "NPK-2026-07", supplier: "Krishi Kendra", expiryDate: new Date(Date.now() + 365 * 86400000) },
        { name: "Urea", category: "FERTILIZER", quantity: 15, unit: "kg", minStock: 20, pricePerUnit: 18, purchaseDate: new Date(Date.now() - 15 * 86400000), supplier: "Krishi Kendra", expiryDate: new Date(Date.now() + 730 * 86400000) },
        { name: "Mancozeb 75% WP", category: "PESTICIDE", quantity: 2, unit: "kg", minStock: 0.5, pricePerUnit: 350, purchaseDate: new Date(Date.now() - 10 * 86400000), batchNo: "MCZ-2026", supplier: "Agri shop", expiryDate: new Date(Date.now() + 20 * 86400000), notes: "Fungicide for blight" },
        { name: "Diesel", category: "FUEL", quantity: 30, unit: "L", minStock: 10, pricePerUnit: 92, purchaseDate: new Date(Date.now() - 5 * 86400000), supplier: "Petrol pump" },
        { name: "Garden Hoe", category: "TOOLS", quantity: 3, unit: "pieces", minStock: 1, pricePerUnit: 450, purchaseDate: new Date("2024-01-15"), supplier: "Hardware store" },
      ];
      for (const i of invData) {
        await db.inventoryItem.create({ data: { ...i, farmId: demoFarm.id, userId: farmer.id } });
      }
      console.log("  ✓ Demo inventory added (6 items)");
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
